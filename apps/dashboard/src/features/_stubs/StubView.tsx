import { Icon } from "@/components/icons";
import { PageHead } from "@/components/Primitives";

export function StubView({ mod }: { mod: string }) {
  return (
    <div className="content-inner">
      <PageHead title={mod} sub="Módulo pendiente de portar al stack de producción" />
      <div className="stub">
        <Icon name="layers" size={42} />
        <h2>{mod}</h2>
        <p>
          La lógica funcional existe en el prototipo HTML (<code>DERMA-OS Demo.html</code>).
          Este módulo se portará a la API Express + Prisma reutilizando el esquema ya modelado
          en <code>apps/api/prisma/schema.prisma</code> y los tipos de <code>lib/types.ts</code>.
        </p>
      </div>
    </div>
  );
}
