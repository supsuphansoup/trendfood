import { LoginForm } from "@/components/admin/login-form";

export default function AdminLoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center gap-6 px-5 py-16">
      <div className="flex flex-col gap-1">
        <p className="text-2xl font-black tracking-[-0.03em]">트렌드푸드</p>
        <h1 className="text-lg font-bold text-body">운영자 로그인</h1>
      </div>
      <LoginForm />
    </main>
  );
}
