// =============================================================================
// KAYA KALPA — Panel: categorías y servicios
// =============================================================================
// Los dos van juntos porque son la misma pantalla del panel: la lista de precios
// se edita por categoría, y separarlos en dos controladores obligaría a saltar de
// archivo para seguir un cambio que la estética hace de una sola vez.
//
// Ninguno de los dos tiene lógica: reciben, llaman al servicio y responden.
// =============================================================================

import type { Request, Response } from 'express';
import { created, ok, paginationMeta } from '../../utils/http';
import { validatedBody, validatedParams, validatedQuery } from '../../middlewares/validate';
import { categoriesService } from '../categories/categories.service';
import { servicesService } from '../services/services.service';
import type { CreateCategoryBody, UpdateCategoryBody } from '../categories/categories.validation';
import type {
  CreateServiceBody,
  ListServicesAdminQuery,
  UpdateServiceBody,
  UpdateServicePriceBody,
} from '../services/services.validation';

/** `{ id }` en la ruta, ya validado como UUID. */
interface IdParams {
  id: string;
}

export const catalogAdminController = {
  // ---------------------------------------------------------------------------
  // Categorías
  // ---------------------------------------------------------------------------

  async listCategories(_req: Request, res: Response): Promise<void> {
    ok(res, await categoriesService.listAll());
  },

  async getCategory(req: Request, res: Response): Promise<void> {
    const { id } = validatedParams<IdParams>(req);
    ok(res, await categoriesService.getById(id));
  },

  async createCategory(req: Request, res: Response): Promise<void> {
    const body = validatedBody<CreateCategoryBody>(req);
    created(res, await categoriesService.create(body));
  },

  async updateCategory(req: Request, res: Response): Promise<void> {
    const { id } = validatedParams<IdParams>(req);
    const body = validatedBody<UpdateCategoryBody>(req);
    ok(res, await categoriesService.update(id, body));
  },

  /**
   * Dar de baja una categoría.
   *
   * Es un `DELETE` que desactiva, no que borra: el servicio rechaza la baja si la
   * categoría todavía tiene servicios activos —los dejaría invisibles en el
   * catálogo sin que nadie entienda por qué—, y una categoría sin servicios se
   * puede volver a habilitar.
   */
  async deactivateCategory(req: Request, res: Response): Promise<void> {
    const { id } = validatedParams<IdParams>(req);
    ok(res, await categoriesService.deactivate(id));
  },

  // ---------------------------------------------------------------------------
  // Servicios
  // ---------------------------------------------------------------------------

  async listServices(req: Request, res: Response): Promise<void> {
    const query = validatedQuery<ListServicesAdminQuery>(req);
    const { items, total } = await servicesService.listForAdmin(query);

    ok(res, items, paginationMeta(query.page, query.perPage, total));
  },

  async getService(req: Request, res: Response): Promise<void> {
    const { id } = validatedParams<IdParams>(req);
    ok(res, await servicesService.getByIdForAdmin(id));
  },

  async createService(req: Request, res: Response): Promise<void> {
    const body = validatedBody<CreateServiceBody>(req);
    created(res, await servicesService.create(body));
  },

  async updateService(req: Request, res: Response): Promise<void> {
    const { id } = validatedParams<IdParams>(req);
    const body = validatedBody<UpdateServiceBody>(req);
    ok(res, await servicesService.update(id, body));
  },

  /**
   * Cambiar solo el precio.
   *
   * Tiene ruta propia porque es la edición más repetida del panel y la que más
   * se hace con apuro: la estética ajusta la lista de precios seguido. Mandar el
   * servicio entero para tocar un número invita a pisar sin querer otro campo que
   * se estaba editando en otra pantalla.
   */
  async updateServicePrice(req: Request, res: Response): Promise<void> {
    const { id } = validatedParams<IdParams>(req);
    const body = validatedBody<UpdateServicePriceBody>(req);
    ok(res, await servicesService.updatePrice(id, body));
  },

  async deactivateService(req: Request, res: Response): Promise<void> {
    const { id } = validatedParams<IdParams>(req);
    ok(res, await servicesService.deactivate(id));
  },
};
