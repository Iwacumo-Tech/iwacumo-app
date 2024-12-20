import prisma from "@/lib/prisma";
import { createTenantSchema, deleteTenantSchema } from "@/server/dtos";
import { publicProcedure } from "@/server/trpc";

export const updateTenant = publicProcedure.input(createTenantSchema).mutation(async (opts)=> {
  return await prisma.tenant.update({
    where: { id: opts.input.id },
    data: {
      name: opts.input.name ?? "",
      contact_email: opts.input.contact_email ??  "",
      slug: opts.input.slug ?? "",
      custom_domain: opts.input.custom_domain?? null,
    }
  });
});

export const deleteTenant = publicProcedure.input(deleteTenantSchema).mutation(async (opts) => {
  return await prisma.tenant.update({
    where: { id: opts.input.id },
    data: { deleted_at: new Date() }
  });
});

export const getAllTenant = publicProcedure.query(async ()=> {
  return await prisma.tenant.findMany({  where: { 
      deleted_at: null, 
    }, include: { publishers: true, users: true}});
});




export const createTenant = publicProcedure
  .input(createTenantSchema) 
  .mutation(async (opts) => {
    const { name, contact_email, custom_domain, slug } = opts.input;
    return await prisma.tenant.create({
      data: {
        name: name ?? "", 
        contact_email: contact_email ?? "", 
        custom_domain: custom_domain ?? null, 
        slug: slug ?? "", 
      },
    });
  });
