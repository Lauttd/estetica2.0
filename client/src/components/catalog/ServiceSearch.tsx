import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PATHS } from '@/routes/paths';
import { CATALOG_PARAMS } from '@/routes/search-params';

/**
 * El buscador del catálogo.
 *
 * BUSCA AL ENVIAR, NO MIENTRAS SE ESCRIBE
 *
 * Buscar en cada tecla obliga a esperar un tiempo antes de consultar —si no, se
 * dispara una petición por letra— y eso trae sus propios problemas: hay que
 * cancelar la anterior, decidir qué hacer si llegan desordenadas, y la lista
 * parpadea mientras alguien todavía está escribiendo "maderoterapia". Con un
 * catálogo que entra entero en una pantalla y un filtro por categoría al lado,
 * enviar con Enter es más simple y se siente más predecible.
 *
 * El texto vive en el estado local y la dirección manda: el campo se sincroniza
 * con la URL cuando esta cambia por otro motivo —el botón "atrás", un enlace
 * compartido—, así que volver a la búsqueda anterior devuelve el texto anterior.
 */
export function ServiceSearch({ basePath = PATHS.services }: { basePath?: string }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const urlQuery = searchParams.get(CATALOG_PARAMS.query) ?? '';
  const [value, setValue] = useState(urlQuery);

  useEffect(() => {
    setValue(urlQuery);
  }, [urlQuery]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const next = new URLSearchParams(searchParams);
    const trimmed = value.trim();

    if (trimmed.length === 0) next.delete(CATALOG_PARAMS.query);
    else next.set(CATALOG_PARAMS.query, trimmed);

    // Buscar cambia el conjunto de resultados, así que la página vuelve a la
    // primera: la 4 de los resultados viejos no dice nada de los nuevos.
    next.delete(CATALOG_PARAMS.page);

    const query = next.toString();
    navigate(query.length === 0 ? basePath : `${basePath}?${query}`);
  }

  return (
    <form onSubmit={submit} role="search" className="mx-auto flex w-full max-w-md gap-2">
      <label htmlFor="buscar-servicio" className="sr-only">
        Buscar un servicio
      </label>

      <input
        id="buscar-servicio"
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Buscar por nombre…"
        autoComplete="off"
        className="w-full rounded-soft border border-beige bg-ivory px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft/70"
      />

      <button
        type="submit"
        className="rounded-soft border border-forest px-4 py-2.5 text-sm font-medium text-forest transition-colors duration-150 hover:bg-forest hover:text-ivory"
      >
        Buscar
      </button>
    </form>
  );
}
