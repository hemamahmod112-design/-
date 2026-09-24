import { useState } from "react";
import { Link } from "wouter";
import {
  ArrowLeft,
  LogOut,
  Package,
  Plus,
  Store,
  Trash2,
  UserRound,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

type ProductDraft = {
  name: string;
  description: string;
  category: string;
  priceMinor: number;
  imageUrl: string;
  stock: number;
  status: "active" | "draft" | "archived";
};
const emptyProduct: ProductDraft = {
  name: "",
  description: "",
  category: "إلكترونيات",
  priceMinor: 0,
  imageUrl:
    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=85",
  stock: 0,
  status: "active",
};

export default function SellerSpace() {
  const auth = useAuth({ redirectOnUnauthenticated: false });
  const [draft, setDraft] = useState<ProductDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const storeQuery = trpc.seller.me.useQuery(undefined, {
    enabled:
      auth.isAuthenticated &&
      (auth.user?.role === "seller" || auth.user?.role === "admin"),
    retry: false,
  });
  const productsQuery = trpc.seller.products.useQuery(undefined, {
    enabled:
      auth.isAuthenticated &&
      (auth.user?.role === "seller" || auth.user?.role === "admin"),
    retry: false,
  });
  const utils = trpc.useUtils();
  const createProduct = trpc.seller.createProduct.useMutation({
    onSuccess: () => {
      utils.seller.products.invalidate();
      setDraft(null);
    },
  });
  const deleteProduct = trpc.seller.deleteProduct.useMutation({
    onSuccess: () => utils.seller.products.invalidate(),
  });
  const createStore = trpc.seller.createStore.useMutation({
    onSuccess: () => utils.seller.me.invalidate(),
    onError: err => setError(err.message),
  });
  const [storeName, setStoreName] = useState("");
  const [slug, setSlug] = useState("");

  if (auth.loading)
    return (
      <div
        dir="rtl"
        className="grid min-h-screen place-items-center bg-[#f6f2ec] text-[#30205c]"
      >
        جاري تجهيز مساحة متجرك...
      </div>
    );
  if (!auth.isAuthenticated)
    return (
      <AccessCard
        title="ابدأ من حسابك"
        text="سجّل الدخول أو أنشئ حسابًا جديدًا للوصول إلى مساحة المتجر."
      />
    );
  if (auth.user?.role !== "seller" && auth.user?.role !== "admin")
    return (
      <AccessCard
        title="مساحة المتجر للبائعين"
        text="أنشئ حسابًا للبائع من صفحة التسجيل ثم عد إلى هنا لإدارة متجرك."
      />
    );

  const store = storeQuery.data;
  const products = productsQuery.data ?? [];
  const saveProduct = () => {
    if (!draft?.name.trim() || draft.priceMinor <= 0)
      return setError("أدخل اسم المنتج وسعرًا صحيحًا");
    setError(null);
    createProduct.mutate({
      ...draft,
      name: draft.name.trim(),
      description: draft.description.trim() || undefined,
      imageUrl: draft.imageUrl.trim() || undefined,
    });
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#f6f2ec] text-[#241f1a]">
      <header className="border-b border-[#e8dfd5] bg-[#fffdfa]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-3 text-xl font-black text-[#30205c]"
          >
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f4c84a]">
              ✦
            </span>
            سوقنا
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full bg-[#eee6ff] px-4 py-2 text-xs font-bold text-[#4d2c99] sm:inline">
              مساحة المتجر
            </span>
            <button
              onClick={() => auth.logout()}
              className="flex items-center gap-2 rounded-full border border-[#ded4ca] px-4 py-2 text-sm font-bold text-[#6f6258] hover:bg-white"
            >
              <LogOut className="h-4 w-4" /> تسجيل الخروج
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-5 py-8 lg:px-8 lg:py-12">
        <section className="overflow-hidden rounded-[2rem] bg-[#30205c] p-7 text-white shadow-[0_24px_80px_rgba(48,32,92,.18)] lg:p-10">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-sm font-bold text-[#f4c84a]">
                مرحبًا {auth.user?.name ?? "بائعنا"}
              </p>
              <h1 className="mt-3 text-3xl font-black md:text-5xl">
                كبّر متجرك بثقة.
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-8 text-white/70">
                أدر منتجاتك من مساحة بسيطة، أنيقة، ومصممة لتساعدك على البيع بشكل
                أفضل.
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full bg-[#f4c84a] px-5 py-3 text-sm font-black text-[#30205c]"
            >
              عرض المتجر <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
        </section>
        {!store ? (
          <section className="mt-7 rounded-[2rem] border border-[#e8dfd5] bg-white p-6 shadow-sm lg:p-8">
            <div className="flex items-start gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#fff3d0] text-[#a17208]">
                <Store />
              </div>
              <div>
                <h2 className="text-xl font-black text-[#30205c]">
                  أنشئ متجرك الأول
                </h2>
                <p className="mt-2 text-sm leading-7 text-[#756b62]">
                  اختر اسمًا ورابطًا بسيطًا، وبعدها ابدأ بإضافة منتجاتك.
                </p>
              </div>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <input
                value={storeName}
                onChange={e => setStoreName(e.target.value)}
                placeholder="اسم المتجر"
                className="rounded-2xl border border-[#ded4ca] bg-[#fffdfa] p-3 outline-none focus:border-[#7651c8]"
              />
              <input
                value={slug}
                onChange={e =>
                  setSlug(
                    e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-")
                  )
                }
                placeholder="رابط المتجر بالإنجليزية مثل: my-store"
                className="rounded-2xl border border-[#ded4ca] bg-[#fffdfa] p-3 outline-none focus:border-[#7651c8]"
              />
            </div>
            {error && (
              <p className="mt-4 rounded-xl bg-[#fff0ec] p-3 text-sm text-[#b84c36]">
                {error}
              </p>
            )}
            <button
              onClick={() => {
                if (!storeName.trim() || !slug.trim())
                  return setError("أكمل اسم المتجر والرابط");
                createStore.mutate({
                  name: storeName.trim(),
                  slug: slug.trim(),
                });
              }}
              className="mt-5 rounded-full bg-[#4d2c99] px-6 py-3 text-sm font-bold text-white"
            >
              إنشاء المتجر
            </button>
          </section>
        ) : (
          <>
            <section className="mt-7 flex flex-wrap items-center justify-between gap-4 rounded-[2rem] border border-[#e8dfd5] bg-white p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#eee6ff] text-[#4d2c99]">
                  <Store />
                </div>
                <div>
                  <h2 className="text-xl font-black text-[#30205c]">
                    {store.name}
                  </h2>
                  <p className="mt-1 text-sm text-[#8d8279]">
                    /{store.slug} • حالة المتجر:{" "}
                    {store.status === "active" ? "نشط" : "قيد المراجعة"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDraft(emptyProduct)}
                className="flex items-center gap-2 rounded-full bg-[#4d2c99] px-5 py-3 text-sm font-bold text-white"
              >
                <Plus className="h-4 w-4" /> إضافة منتج
              </button>
            </section>
            {draft && (
              <section className="mt-5 rounded-[2rem] border border-[#dcd0ed] bg-[#fbf9ff] p-6">
                <h2 className="text-lg font-black text-[#30205c]">منتج جديد</h2>
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <input
                    value={draft.name}
                    onChange={e => setDraft({ ...draft, name: e.target.value })}
                    placeholder="اسم المنتج"
                    className="rounded-xl border p-3"
                  />
                  <input
                    value={draft.category}
                    onChange={e =>
                      setDraft({ ...draft, category: e.target.value })
                    }
                    placeholder="التصنيف"
                    className="rounded-xl border p-3"
                  />
                  <input
                    type="number"
                    value={draft.priceMinor / 100 || ""}
                    onChange={e =>
                      setDraft({
                        ...draft,
                        priceMinor: Number(e.target.value) * 100,
                      })
                    }
                    placeholder="السعر بالريال"
                    className="rounded-xl border p-3"
                  />
                  <input
                    type="number"
                    value={draft.stock}
                    onChange={e =>
                      setDraft({ ...draft, stock: Number(e.target.value) })
                    }
                    placeholder="المخزون"
                    className="rounded-xl border p-3"
                  />
                  <input
                    value={draft.imageUrl}
                    onChange={e =>
                      setDraft({ ...draft, imageUrl: e.target.value })
                    }
                    placeholder="رابط صورة المنتج"
                    className="rounded-xl border p-3 md:col-span-2"
                  />
                  <textarea
                    value={draft.description}
                    onChange={e =>
                      setDraft({ ...draft, description: e.target.value })
                    }
                    placeholder="وصف قصير"
                    className="min-h-24 rounded-xl border p-3 md:col-span-2"
                  />
                </div>
                {error && (
                  <p className="mt-4 text-sm text-[#b84c36]">{error}</p>
                )}
                <div className="mt-5 flex gap-3">
                  <button
                    onClick={saveProduct}
                    disabled={createProduct.isPending}
                    className="rounded-full bg-[#4d2c99] px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
                  >
                    {createProduct.isPending ? "جاري الحفظ..." : "حفظ المنتج"}
                  </button>
                  <button
                    onClick={() => setDraft(null)}
                    className="rounded-full bg-white px-5 py-3 text-sm font-bold"
                  >
                    إلغاء
                  </button>
                </div>
              </section>
            )}
            <section className="mt-7">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-[#8f5fd4]">كتالوجك</p>
                  <h2 className="mt-1 text-2xl font-black text-[#30205c]">
                    منتجات المتجر
                  </h2>
                </div>
                <span className="rounded-full bg-white px-4 py-2 text-xs font-bold text-[#8d8279]">
                  {products.length} منتجات
                </span>
              </div>
              {products.length === 0 ? (
                <div className="rounded-[2rem] border border-dashed border-[#d8c9ee] bg-white p-12 text-center text-[#8d8279]">
                  <Package className="mx-auto h-10 w-10 text-[#7651c8]" />
                  <p className="mt-3">لم تضف منتجات بعد. ابدأ بمنتجك الأول.</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {products.map(product => (
                    <article
                      key={product.id}
                      className="overflow-hidden rounded-[1.5rem] border border-[#e8dfd5] bg-white shadow-sm"
                    >
                      <img
                        src={product.imageUrl ?? emptyProduct.imageUrl}
                        alt={product.name}
                        className="h-44 w-full object-cover"
                      />
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-black text-[#30205c]">
                              {product.name}
                            </h3>
                            <p className="mt-1 text-xs text-[#8d8279]">
                              {product.category} • {product.stock} في المخزون
                            </p>
                          </div>
                          <button
                            onClick={() =>
                              deleteProduct.mutate({ id: product.id })
                            }
                            className="rounded-xl bg-[#fff0ec] p-2 text-[#b84c36]"
                            aria-label="حذف المنتج"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <p className="mt-4 font-black text-[#4d2c99]">
                          {(product.priceMinor / 100).toLocaleString("ar-SA")}{" "}
                          ر.س
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function AccessCard({ title, text }: { title: string; text: string }) {
  return (
    <div
      dir="rtl"
      className="grid min-h-screen place-items-center bg-[#f6f2ec] px-5"
    >
      <div className="w-full max-w-md rounded-[2rem] border border-[#e8dfd5] bg-white p-8 text-center shadow-xl">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#eee6ff] text-[#4d2c99]">
          <UserRound />
        </div>
        <h1 className="mt-5 text-2xl font-black text-[#30205c]">{title}</h1>
        <p className="mt-3 text-sm leading-7 text-[#756b62]">{text}</p>
        <Link
          href="/login"
          className="mt-6 inline-flex rounded-full bg-[#4d2c99] px-6 py-3 font-bold text-white"
        >
          تسجيل الدخول / تسجيل جديد
        </Link>
      </div>
    </div>
  );
}
