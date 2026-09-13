import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { TRPCClientError } from "@trpc/client";
import { useAuth } from "@/_core/hooks/useAuth";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const auth = useAuth();
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (auth.isAuthenticated) navigate("/");
  }, [auth.isAuthenticated, navigate]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const normalizedEmail = email.trim().toLowerCase();
    if (!emailPattern.test(normalizedEmail)) return setError("أدخل بريدًا إلكترونيًا صحيحًا مثل name@example.com");
    if (password.length < 8) return setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
    if (mode === "register" && name.trim().length < 2) return setError("الاسم يجب أن يكون حرفين على الأقل");

    setSubmitting(true);
    try {
      if (mode === "register") await auth.register(name.trim(), normalizedEmail, password);
      else await auth.login(normalizedEmail, password);
      navigate("/");
    } catch (err) {
      setError(err instanceof TRPCClientError ? err.message : "حدث خطأ غير متوقع، حاول مرة أخرى");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div dir="rtl" className="grid min-h-screen place-items-center bg-[#fbfaf8] px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
        <Link href="/" className="flex items-center gap-2 text-xl font-black text-[#39206f]"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#f6c744]">✦</span> سوقنا</Link>
        <h1 className="mt-6 text-2xl font-black">{mode === "login" ? "تسجيل الدخول" : "إنشاء حساب جديد"}</h1>
        <p className="mt-2 text-sm text-[#756b62]">{mode === "login" ? "ادخل ببريدك الإلكتروني وكلمة المرور." : "أنشئ حسابك لمتابعة طلباتك بسهولة."}</p>
        <form onSubmit={submit} noValidate className="mt-6 grid gap-4">
          {mode === "register" && <label className="grid gap-2 text-sm font-bold">الاسم<input value={name} onChange={e => setName(e.target.value)} placeholder="اكتب اسمك" autoComplete="name" className="rounded-xl border p-3 font-normal outline-none focus:border-[#7651c8]" /></label>}
          <label className="grid gap-2 text-sm font-bold">البريد الإلكتروني<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" autoComplete="email" className="rounded-xl border p-3 font-normal outline-none focus:border-[#7651c8]" /></label>
          <label className="grid gap-2 text-sm font-bold">كلمة المرور<input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="8 أحرف على الأقل" autoComplete={mode === "login" ? "current-password" : "new-password"} className="rounded-xl border p-3 font-normal outline-none focus:border-[#7651c8]" /></label>
          {error && <div role="alert" className="rounded-xl bg-[#fff0ec] p-3 text-sm text-[#b84c36]">{error}</div>}
          <button type="submit" disabled={submitting} className="mt-2 rounded-full bg-[#4d2c99] px-6 py-3 font-bold text-white disabled:opacity-60">{submitting ? "جاري التنفيذ..." : mode === "login" ? "دخول" : "إنشاء الحساب"}</button>
        </form>
        {mode === "login" && auth.isAuthenticated && <Link href="/orders" className="mt-4 block text-center text-sm font-bold text-[#7651c8]">عرض طلباتي</Link>}
        <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); }} className="mt-5 block w-full text-center text-sm font-bold text-[#7651c8]">{mode === "login" ? "ليس لديك حساب؟ سجّل الآن" : "لديك حساب بالفعل؟ سجّل الدخول"}</button>
        <Link href="/" className="mt-4 block text-center text-sm text-[#8d8279]">العودة للمتجر</Link>
      </div>
    </div>
  );
}
