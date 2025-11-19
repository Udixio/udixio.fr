import {DealStatus, PrismaClient} from "../generated/prisma/client";
import {withAccelerate} from "@prisma/extension-accelerate";

const prisma = new PrismaClient({
    datasourceUrl: import.meta.env.DATABASE_URL,
}).$extends(withAccelerate())
    .$extends({
        query: {
            deal: {
                async create({args, query}) {
                    // Si le statut est LEAD ou autre, définir openedAt
                    if (args.data.status && !args.data.openedAt) {
                        args.data.openedAt = new Date();
                    }
                    return query(args);
                },
                async update({args, query}) {
                    if (args.data.status) {
                        const newStatus = args.data.status;

                        // Si le deal devient WON ou LOST et que closedAt n'est pas défini
                        if (
                            (newStatus === DealStatus.WON || newStatus === DealStatus.LOST) &&
                            !args.data.closedAt
                        ) {
                            args.data.closedAt = new Date();
                        }

                        // Si le deal repasse en LEAD et openedAt n'est pas défini
                        // Note: 'create' couvre déjà le cas initial, ici c'est pour un retour en arrière
                        if (newStatus === DealStatus.LEAD && !args.data.openedAt) {
                            args.data.openedAt = new Date();
                        }
                    }
                    return query(args);
                }
            }
        }
    });

export default prisma;