import { prisma } from "@/lib/prisma";
import { sendPriceDropEmail } from "@/lib/sendgrid";

type PriceAlertContext = {
  product: { id: string; name: string; slug: string };
  store: { id: string; name: string };
  newPrice: { amount: number; currency: string; recordedAt: Date };
};

export async function handlePriceDropAlert({ product, store, newPrice }: PriceAlertContext) {
  const previousPrice = await prisma.price.findFirst({
    where: {
      productId: product.id,
      storeId: store.id,
      recordedAt: { lt: newPrice.recordedAt },
    },
    orderBy: { recordedAt: "desc" },
  });

  if (!previousPrice || newPrice.amount >= previousPrice.amount) {
    return;
  }

  const subscriptions = await prisma.priceAlertSubscription.findMany({
    where: { productId: product.id },
    include: { user: true },
  });

  if (!subscriptions.length) {
    return;
  }

  const notificationData = subscriptions.map(
    (subscription: { userId: string }) => ({
      userId: subscription.userId,
      productId: product.id,
      storeId: store.id,
      fromAmount: previousPrice.amount,
      toAmount: newPrice.amount,
      currency: newPrice.currency,
      recordedAt: newPrice.recordedAt,
    })
  );

  await prisma.priceAlertNotification.createMany({ data: notificationData });

  await Promise.all(
    subscriptions.map((subscription: { user: { email: string } }) =>
      sendPriceDropEmail({
        to: subscription.user.email,
        productName: product.name,
        productSlug: product.slug,
        storeName: store.name,
        fromAmount: previousPrice.amount,
        toAmount: newPrice.amount,
        currency: newPrice.currency,
        recordedAt: newPrice.recordedAt,
      })
    )
  );
}
