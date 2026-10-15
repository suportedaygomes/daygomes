import { redirect } from "next/navigation";

/** Página descontinuada para membros; mantida só para links antigos. */
export default function CorretoresPage() {
  redirect("/painel");
}
