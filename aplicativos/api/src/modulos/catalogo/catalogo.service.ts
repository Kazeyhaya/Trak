import {
  Injectable,
  InternalServerErrorException,
  NotFoundException
} from "@nestjs/common";
import { SupabaseService } from "../../comum/supabase/supabase.service";

@Injectable()
export class CatalogoService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async listar() {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from("MediaItem")
      .select("id,externalId,source,type,title,coverUrl,synopsis,releaseYear")
      .order("title", { ascending: true });

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return data ?? [];
  }

  async buscarPorId(id: string) {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from("MediaItem")
      .select("id,externalId,source,type,title,coverUrl,synopsis,releaseYear")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    const item = data;
    if (!item) {
      throw new NotFoundException("Item nao encontrado.");
    }
    return item;
  }
}
