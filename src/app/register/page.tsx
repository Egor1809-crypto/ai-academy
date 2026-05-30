import { redirect } from "next/navigation";

// Самостоятельная регистрация аккаунта убрана: клиенты оставляют заявку на
// лендинге, доступ в кабинет — через вход по Telegram. Старая ссылка ведёт на вход.
export default function RegisterPage() {
  redirect("/login");
}
