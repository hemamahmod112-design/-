import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Package, ShieldAlert, ShoppingBag } from "lucide-react";
import { TRPCClientError } from "@trpc/client";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

const statusLabels: Record<string, string> = {
  new: "جديد",
  processing: "قيد التجهيز",
  shipped: "تم الشحن",
  completed: "مكتمل",
  cancelled: "ملغي",
};

const statusStyles: Record<string, string> = {
  new: "bg-[#fff4d6] text-[#946c00]",
  processing: "bg-[#eee6ff] text-[#4d2c99]",
  shipped: "bg-[#e8f3ff] text-[#24649b]",
  completed: "bg-[#e4f6ec] text-[#32805a]",
  cancelled: "bg-[#fff0ec] text-[#b84c36]",
};

export default function CustomerOrders() {
  const auth = useAuth();
  const [, navigate] = useLocation();
  const ordersQuery = trpc.customer.orders.useQuery(undefined, {
    enabled: auth.isAuthenticated,
    retry: false,
  });

  useEffect(() => {
    if (!auth.loading && !auth.isAuthenticated) navigate("/login");
  }, [auth.loading, auth.isAuthenticated, navigate]);

  if (auth.loading || !auth.isAuthenticated) {
    return <div dir="rtl" className="grid min-h-screen place-items-center bg-[#fbfaf8] text-[#756b62]">جاري التحقق من الحساب...</div>;
  }

  const format = (minor: number) => `${(minor / 100).toLocaleString("ar-SA")} ر.س`;
  const errorMessage = ordersQuery.error instanceof TRPCClientError
    ? ordersQuery.error.message
    : "تعذر تحميل طلباتك الآن، حاول مرة أخرى.";

  return (
    <div dir="rtl" className="min-h-screen bg-[#f8f6f2] text-[#241f1a]">
      <header className="border-b border-[#e8e0d8] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 lg:px-8">
          <Link href="/" className="flex items-center gap-2 text-xl font-black text-[#39206f]"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#f6c744]">✦</span> سوقنا</Link>
          <div className="flex items-center gap-3 text-sm"><span className="hidden text-[#756b62] sm:inline">مرحباً، {auth.user?.name ?? "عميلنا"}</span><button onClick={() => auth.logout()} className="rounded-full border border-[#e8e0d8] px-4 py-2 font-bold text-[#4d2c99]">تسجيل الخروج</button></div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-10 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-sm font-bold text-[#7651c8]">حسابي</p><h1 className="mt-2 text-3xl font-black">طلباتي</h1><p className="mt-2 text-[#756b62]">تابع حالة طلباتك وتفاصيلها من مكان واحد.</p></div>
          <Link href="/" className="rounded-full bg-[#4d2c99] px-5 py-3 text-sm font-bold text-white">متابعة التسوق</Link>
        </div>

        {ordersQuery.isLoading && <div className="mt-8 grid gap-4"><div className="h-32 animate-pulse rounded-2xl bg-white" /><div className="h-32 animate-pulse rounded-2xl bg-white" /></div>}
        {ordersQuery.error && <div className="mt-8 flex items-start gap-3 rounded-2xl bg-[#fff0ec] p-5 text-[#b84c36]"><ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-bold">حدثت مشكلة</p><p className="mt-1 text-sm">{errorMessage}</p><button onClick={() => ordersQuery.refetch()} className="mt-3 rounded-full bg-white px-4 py-2 text-sm font-bold">إعادة المحاولة</button></div></div>}
        {!ordersQuery.isLoading && !ordersQuery.error && ordersQuery.data?.length === 0 && <div className="mt-8 rounded-3xl border border-dashed border-[#d9cfc5] bg-white px-6 py-16 text-center"><ShoppingBag className="mx-auto h-12 w-12 text-[#7651c8]" /><h2 className="mt-4 text-xl font-black">لا توجد طلبات حتى الآن</h2><p className="mt-2 text-[#756b62]">ابدأ التسوق وستظهر طلباتك هنا بعد إتمامها.</p><Link href="/" className="mt-6 inline-block rounded-full bg-[#f6c744] px-6 py-3 font-bold text-[#30205c]">اكتشف المنتجات</Link></div>}
        {!ordersQuery.isLoading && !ordersQuery.error && (ordersQuery.data?.length ?? 0) > 0 && <div className="mt-8 grid gap-4">{ordersQuery.data?.map(order => <article key={order.id} className="rounded-3xl border border-[#eee7df] bg-white p-5 shadow-sm lg:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div className="flex items-start gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#eee6ff] text-[#4d2c99]"><Package className="h-5 w-5" /></div><div><h2 className="font-black">طلب {order.orderNumber}</h2><p className="mt-1 text-sm text-[#8d8279]">{new Date(order.createdAt).toLocaleDateString("ar-SA", { dateStyle: "medium" })}</p></div></div><span className={`rounded-full px-3 py-2 text-xs font-bold ${statusStyles[order.status] ?? "bg-[#f3eee8] text-[#756b62]"}`}>{statusLabels[order.status] ?? order.status}</span></div><div className="mt-5 flex flex-wrap gap-6 border-t border-[#f0ebe5] pt-4 text-sm"><div><p className="text-[#8d8279]">الإجمالي</p><p className="mt-1 font-black text-[#39206f]">{format(order.totalMinor)}</p></div><div><p className="text-[#8d8279]">طريقة الدفع</p><p className="mt-1 font-bold">الدفع عند الاستلام</p></div></div></article>)}</div>}
      </main>
    </div>
  );
}
