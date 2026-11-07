// Monta o banco do Trak num Postgres em memoria (PGlite) e confere que tudo aplica:
// shim do Supabase -> supabase/schema.sql -> migracoes mais novas que o retrato -> testes.
// Uso: npm run db:verificar
import { PGlite } from "@electric-sql/pglite";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const raiz = join(import.meta.dirname, "..");
const pastaSupabase = join(raiz, "supabase");
const pastaMigracoes = join(pastaSupabase, "migrations");
const pastaTestes = join(pastaSupabase, "testes");
const SHIM = join(pastaTestes, "supabase-shim.sql");
const SCHEMA = join(pastaSupabase, "schema.sql");

const db = new PGlite();
let falhou = false;

// Quebra o SQL em comandos respeitando aspas, comentarios e corpos $tag$...$tag$.
// Devolve o deslocamento de inicio de cada comando, para apontar a linha que falhou.
function comandos(sql) {
  const lista = [];
  let inicio = 0;
  let i = 0;
  while (i < sql.length) {
    const resto = sql.slice(i);
    const dolar = resto.match(/^\$[A-Za-z_]*\$/);
    if (resto.startsWith("--")) {
      i = sql.indexOf("\n", i) === -1 ? sql.length : sql.indexOf("\n", i);
    } else if (resto.startsWith("/*")) {
      i = sql.indexOf("*/", i + 2) === -1 ? sql.length : sql.indexOf("*/", i + 2) + 2;
    } else if (sql[i] === "'" || sql[i] === '"') {
      const fim = sql.indexOf(sql[i], i + 1);
      i = fim === -1 ? sql.length : fim + 1;
    } else if (dolar) {
      const fim = sql.indexOf(dolar[0], i + dolar[0].length);
      i = fim === -1 ? sql.length : fim + dolar[0].length;
    } else if (sql[i] === ";") {
      lista.push({ inicio, texto: sql.slice(inicio, i + 1) });
      inicio = ++i;
    } else {
      i++;
    }
  }
  if (sql.slice(inicio).trim()) {
    lista.push({ inicio, texto: sql.slice(inicio) });
  }
  return lista.filter((comando) => comando.texto.replace(/--.*$/gm, "").trim());
}

function descreverLinha(sql, deslocamento) {
  const linha = sql.slice(0, deslocamento).split("\n").length;
  const texto = sql.split("\n")[linha - 1]?.trim() ?? "";
  return `linha ${linha}: ${texto.slice(0, 120)}`;
}

// O PGlite nem sempre informa a posicao do erro. Nesse caso, reaplica o arquivo comando
// a comando numa transacao desfeita no fim, so para descobrir qual comando falhou.
async function localizarErro(sql, erro) {
  if (erro.position) {
    return descreverLinha(sql, Number(erro.position) - 1);
  }
  await db.exec("begin");
  try {
    for (const comando of comandos(sql)) {
      try {
        await db.exec(comando.texto);
      } catch {
        const primeiraLinha = comando.texto.slice(comando.texto.search(/\S/));
        return descreverLinha(sql, comando.inicio + comando.texto.length - primeiraLinha.length);
      }
    }
    return "comando nao localizado";
  } finally {
    await db.exec("rollback");
  }
}

async function aplicar(arquivo) {
  const sql = readFileSync(arquivo, "utf8");
  try {
    await db.exec(sql);
    console.log(`  ok  ${relative(raiz, arquivo)}`);
    return true;
  } catch (erro) {
    console.error(`  ERRO ${relative(raiz, arquivo)} (${await localizarErro(sql, erro)})`);
    console.error(`       ${erro.message}`);
    return false;
  }
}

if (!existsSync(SCHEMA)) {
  console.error("supabase/schema.sql nao existe. Gere com supabase/ferramentas/extrair-schema.sql.");
  process.exit(1);
}

// O cabecalho do retrato diz ate qual migracao ele ja inclui; so as posteriores sao aplicadas.
const marca = readFileSync(SCHEMA, "utf8").match(/Inclui as migracoes ate:\s*(\d{14})/)?.[1];
if (!marca) {
  console.error('supabase/schema.sql precisa da linha "-- Inclui as migracoes ate: AAAAMMDDNNNNNN".');
  process.exit(1);
}

const migracoes = existsSync(pastaMigracoes)
  ? readdirSync(pastaMigracoes)
      .filter((nome) => /^\d{14}_.+\.sql$/.test(nome) && nome.slice(0, 14) > marca)
      .sort()
  : [];

console.log("Banco:");
for (const arquivo of [SHIM, SCHEMA, ...migracoes.map((nome) => join(pastaMigracoes, nome))]) {
  if (!(await aplicar(arquivo))) {
    process.exit(1);
  }
}

// Cada teste roda numa transacao desfeita no fim, entao um nao enxerga os dados do outro.
const testes = readdirSync(pastaTestes)
  .filter((nome) => nome.endsWith(".sql") && join(pastaTestes, nome) !== SHIM)
  .sort();

console.log("Testes:");
for (const nome of testes) {
  const sql = readFileSync(join(pastaTestes, nome), "utf8");
  try {
    await db.exec(`begin;\n${sql}\n;rollback;`);
    console.log(`  ok  ${nome}`);
  } catch (erro) {
    await db.exec("rollback").catch(() => {});
    console.error(`  FALHOU ${nome}: ${erro.message}`);
    falhou = true;
  }
}

await db.close();
if (falhou) {
  process.exitCode = 1;
} else {
  console.log(`Tudo certo: retrato ate ${marca}, ${migracoes.length} migracao(oes) nova(s), ${testes.length} teste(s).`);
}
