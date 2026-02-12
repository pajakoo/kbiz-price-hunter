import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getProductCategories } from "@/lib/product-categories";
import { normalizeProductName } from "@/lib/product-normalize";

const EMAG_MONITORS = [
  {
    name: "Монитор Gaming LED VA Samsung Odyssey G3 24\", Full HD (1920x1080), 180Hz, 1ms, AMD FreeSync™, HDR 10, HDMI, Display Port, Pivot, VESA, Черен",
    price: 118.0,
  },
  {
    name: "Монитор Gaming LED VA Samsung Odyssey G5 27\", Извит, QHD (2560x1440), 165Hz, 1ms, AMD FreeSync™, HDR10, 1000R, HDMI, DIsplay Port, Jack, VESA, Черен",
    price: 189.54,
  },
  {
    name: "Преносим монитор LED IPS Arzopa A1s 14\", Full HD (1920x1080), 60Hz, Mini HDMI, USB-C, Високоговорители 1W x2, Съвместим с конзола, Черен",
    price: 68.94,
  },
  {
    name: "Монитор Gaming Philips EVNIA 27\" IPS FHD, 144Hz, 4ms (0.5ms MPRT) HDR10 FlickerFree HDMI DisplayPort",
    price: 140.58,
  },
  {
    name: "Монитор за игри AOC 24G42E, 23.8\", Full HD, 180 HZ, 0.5 ms, Adaptive Sync, Fast IPS, HDR10, Черен",
    price: 97.62,
  },
  {
    name: "Монитор Gaming AOC 31.5\", VA, Извит, FHD, 240Hz, 0.5 ms, AMD, 2x HDMI, DisplayPort, Jack, FrameLess, VESA, Черен",
    price: 216.79,
  },
  {
    name: "Монитор Philips 24E2N1110, 23.8\" IPS WLED, 1920x1080@120Hz, 4ms GtG, 1ms MPRT, 300cd m/2, 1500:1, Mega Infinity DCR, Adaptive Sync, FlickerFree, LowBlue Mode, Tilt, D-SUB, HDMI 24E2N1110",
    price: 79.0,
  },
  {
    name: "Монитор Gaming LED VA AOC C27G4ZXE 27\", Извит, Full HD (1920x1080), 280Hz, 0.3ms MPRT (1ms GTG), AMD FreeSync Premium, HDR10, FlickerFree, 2x HDMI, DisplayPort, VESA, Черен",
    price: 163.97,
  },
  {
    name: "Геймърски монитор LED IPS GIGABYTE GS25F2 24.5\", Full HD (1920x1080), 200Hz, 1ms GTG, AMD FreeSync™ Premium, HDR10, 2W x2 високоговорителя, 2x HDMI, DisplayPort, Jack, VESA, черен",
    price: 114.49,
  },
  {
    name: "Монитор Gaming KTC H32S17F, 32'' Curved, 1920x1080, 240Hz, 125% sRGB, черен, VESA 100x100mm, 3500:1, адаптивна синхронизация, HDR10, време за реакция 3 ms, 2*HDMI 2.0, 1*DP 1.4, 1*USB 2.0, 1*аудио",
    price: 314.09,
  },
];

function buildSlug(index: number) {
  return `emag-monitor-${index + 1}`;
}

function buildPriceSeries(basePrice: number) {
  const today = new Date();
  const points = [14, 7, 0].map((daysAgo, idx) => {
    const date = new Date(today);
    date.setDate(today.getDate() - daysAgo);
    const multiplier = idx === 0 ? 1.08 : idx === 1 ? 1.03 : 1;
    return {
      recordedAt: date,
      amount: Number((basePrice * multiplier).toFixed(2)),
    };
  });

  return points;
}

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const existingStore = await prisma.store.findFirst({ where: { name: "eMAG" } });
  const store =
    existingStore ??
    (await prisma.store.create({
      data: {
        name: "eMAG",
        city: "Sofia",
      },
    }));

  let createdProducts = 0;
  let createdPrices = 0;

  for (const [index, item] of EMAG_MONITORS.entries()) {
    const slug = buildSlug(index);
    const normalizedName = normalizeProductName(item.name);
    const categories = getProductCategories(normalizedName, normalizedName);
    const product = await prisma.product.upsert({
      where: { slug },
      update: {
        name: normalizedName,
        description: normalizedName,
        categories,
      },
      create: {
        slug,
        name: normalizedName,
        description: normalizedName,
        categories,
      },
    });

    if (product.createdAt.getTime() === product.updatedAt.getTime()) {
      createdProducts += 1;
    }

    await prisma.price.deleteMany({
      where: {
        productId: product.id,
        storeId: store.id,
      },
    });

    const pricePoints = buildPriceSeries(item.price);
    await prisma.price.createMany({
      data: pricePoints.map((point) => ({
        productId: product.id,
        storeId: store.id,
        amount: point.amount,
        currency: "EUR",
        recordedAt: point.recordedAt,
        source: "emag",
      })),
    });

    createdPrices += pricePoints.length;
  }

  const uiProduct = await prisma.product.findUnique({
    where: { slug: "ui-test-product" },
  });

  if (uiProduct) {
    await prisma.price.deleteMany({
      where: {
        productId: uiProduct.id,
        storeId: store.id,
      },
    });

    const uiPricePoints = buildPriceSeries(99.9);
    await prisma.price.createMany({
      data: uiPricePoints.map((point) => ({
        productId: uiProduct.id,
        storeId: store.id,
        amount: point.amount,
        currency: "EUR",
        recordedAt: point.recordedAt,
      })),
    });

    createdPrices += uiPricePoints.length;
  }

  return NextResponse.json({
    ok: true,
    store: { id: store.id, name: store.name },
    createdProducts,
    createdPrices,
  });
}
