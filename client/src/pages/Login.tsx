import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Store, UserRound, UserPlus, ArrowRight, ShieldCheck } from "lucide-react";
import { TRPCClientError } from "@trpc/client";
import { useAuth } from "@/_core/hooks/useAuth";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
type RegistrationType = "user" | "seller";

function getInitialState() {
  if (typeof window === "undefined") return { mode: "login" as const, type: "user" as RegistrationType };
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode") === "register" ? "register" as const : "login" as const;
  const type = params.get("type") === "seller" ? "seller" as const : "user" as const;
  return { mode, type };
}

export default function Login() {
  const auth = useAuth();
  const [, navigate] = useLocation();
  const initial = getInitialState();
  const [mode, setMode] = useState<"login" | "register">(initial.mode);
  const [accountType, setAccountType] = useState<RegistrationType>(initial.type);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const normalizedEmail = email.trim().toLowerCase();
    if (!emailPattern.test(normalizedEmail)) return setError("أدخل بريدًا إلكترونيًا صحيحًا مثل name@example.com");
    if (password.length < 8) return setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
    if (mode === "register" && name.trim().length < 2) return setError("الاسم يجب أن يكون حرفين على الأقل");

    setSubmitting(true);
    try {
      if (mode === "register") await auth.register(name.trim(), normalizedEmail, password, accountType);
      else await auth.login(normalizedEmail, password);
      navigate("/");
    } catch (err) {
      setError(err instanceof TRPCClientError ? err.message : "حدث خطأ غير متوقع، حاول مرة أخرى");
    } finally {
      setSubmitting(false);
    }
  };

  const switchMode = () => {
    setMode(current => current === "login" ? "register" : "login");
    setError(null);
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#f4eee8] px-4 py-8 md:py-12">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-5xl overflow-hidden rounded-[2rem] border border-[#ded2ee] bg-white shadow-[0_24px_80px_rgba(48,32,92,0.14)] lg:grid-cols-[.9fr_1.1fr]">
        <section className="hidden flex-col justify-between bg-[#30205c] p-10 text-white lg:flex">
          <div><Link href="/" className="flex items-center gap-2 text-xl font-black"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#f6c744] text-[#30205c]">✦</span> سوقنا</Link><div className="mt-24"><p className="text-sm font-bold text-[#f6c744]">مكانك في السوق العربي</p><h1 className="mt-4 text-4xl font-black leading-tight">ادخل إلى عالم<br /><span className="text-[#f6c744]">سوقنا.</span></h1><p className="mt-5 max-w-sm text-sm leading-8 text-white/70">حساب واحد يوصلك إلى المنتجات والمتاجر والفرص التي تناسبك.</p></div></div>
          <div className="flex items-center gap-2 text-xs text-white/70"><ShieldCheck className="h-4 w-4 text-[#f6c744]" /> بياناتك محمية وتجربتك مصممة لك</div>
        </section>

        <section className="p-6 sm:p-10">
          <div className="flex items-center justify-between"><Link href="/" className="flex items-center gap-2 text-lg font-black text-[#39206f] lg:hidden"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#f6c744]">✦</span> سوقنا</Link><Link href="/" className="mr-auto text-sm font-bold text-[#8d8279]">العودة للمتجر</Link></div>
          <div className="mt-10"><p className="text-sm font-bold text-[#8f5fd4]">بوابة الحساب</p><h2 className="mt-2 text-3xl font-black text-[#30205c]">{mode === "login" ? "مرحباً بعودتك" : "أنشئ حسابك"}</h2><p className="mt-2 text-sm leading-7 text-[#756b62]">{mode === "login" ? "سجّل الدخول للمتابعة في سوقنا." : "اختر نوع الحساب الذي يناسب تجربتك."}</p></div>

          <form onSubmit={submit} noValidate className="mt-8 grid gap-4">
            {mode === "register" && <>
              <div className="grid gap-3 sm:grid-cols-2">
                <button type="button" onClick={() => setAccountType("user")} className={`rounded-2xl border p-4 text-right transition ${accountType === "user" ? "border-[#7651c8] bg-[#f6f1ff] text-[#39206f] shadow-sm" : "border-[#eee7df] bg-[#fcfaf7] text-[#756b62]"}`}><div className="flex items-center justify-between"><span className="font-black">مستخدم</span><UserRound className="h-5 w-5" /></div><p className="mt-2 text-xs leading-5">للتسوق ومتابعة الطلبات</p></button>
                <button type="button" onClick={() => setAccountType("seller")} className={`rounded-2xl border p-4 text-right transition ${accountType === "seller" ? "border-[#d19d2a] bg-[#fff8e8] text-[#6f4c08] shadow-sm" : "border-[#eee7df] bg-[#fcfaf7] text-[#756b62]"}`}><div className="flex items-center justify-between"><span className="font-black">بائع</span><Store className="h-5 w-5" /></div><p className="mt-2 text-xs leading-5">لعرض المنتجات وتنمية متجرك</p></button>
              </div>
              <label className="grid gap-2 text-sm font-bold">الاسم<input value={name} onChange={e => setName(e.target.value)} placeholder="اكتب اسمك أو اسم المتجر" autoComplete="name" className="rounded-xl border border-[#dfd6cd] bg-white p-3 font-normal outline-none focus:border-[#7651c8]" /></label>
            </>}
            <label className="grid gap-2 text-sm font-bold">البريد الإلكتروني<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" autoComplete="email" className="rounded-xl border border-[#dfd6cd] bg-white p-3 font-normal outline-none focus:border-[#7651c8]" /></label>
            <label className="grid gap-2 text-sm font-bold">كلمة المرور<input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="8 أحرف على الأقل" autoComplete={mode === "login" ? "current-password" : "new-password"} className="rounded-xl border border-[#dfd6cd] bg-white p-3 font-normal outline-none focus:border-[#7651c8]" /></label>
            {error && <div role="alert" className="rounded-xl bg-[#fff0ec] p-3 text-sm text-[#b84c36]">{error}</div>}
            <button type="submit" disabled={submitting} className="mt-2 flex items-center justify-center gap-2 rounded-full bg-[#4d2c99] px-6 py-3 font-bold text-white transition hover:bg-[#392078] disabled:opacity-60">{submitting ? "جاري التنفيذ..." : mode === "login" ? "تسجيل الدخول" : `إنشاء حساب ${accountType === "seller" ? "بائع" : "مستخدم"}`}<ArrowRight className="h-4 w-4" /></button>
          </form>

          <div className="mt-7 border-t border-[#eee7df] pt-6 text-center"><p className="text-sm text-[#756b62]">{mode === "login" ? "ليس لديك حساب بعد؟" : "لديك حساب بالفعل؟"}</p><button onClick={switchMode} className="mt-2 inline-flex items-center gap-2 text-sm font-black text-[#7651c8]">{mode === "login" ? "سجّل الآن واختر نوع حسابك" : "العودة إلى تسجيل الدخول"}<UserPlus className="h-4 w-4" /></button></div>
        </section>
      </div>
    </div>
  );
}
