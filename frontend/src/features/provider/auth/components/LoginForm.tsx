import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";

import Button from "@/components/ui/Button";
import Notice from "@/components/ui/Notice";
import TextInput from "@/components/ui/TextInput";
import { errorMessage } from "@/lib/errors";

import { loginProvider } from "../api";

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter your e-mail address.")
    .max(320, "Use at most 320 characters."),
  password: z.string().min(1, "Enter your password.").max(128, "Use at most 128 characters."),
});

type LoginValues = z.infer<typeof loginSchema>;

type Props = {
  onSuccess: () => void;
};

export default function LoginForm({ onSuccess }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const login = useMutation({
    mutationFn: (values: LoginValues) => loginProvider(values.email, values.password),
    onSuccess,
  });

  return (
    <form
      noValidate
      onSubmit={handleSubmit((values) => login.mutate(values))}
      className="space-y-4"
    >
      <TextInput
        label="E-mail"
        type="email"
        autoComplete="email"
        required
        error={errors.email?.message}
        {...register("email")}
      />
      <TextInput
        label="Password"
        type="password"
        autoComplete="current-password"
        required
        error={errors.password?.message}
        {...register("password")}
      />

      {login.isError ? <Notice tone="error">{errorMessage(login.error)}</Notice> : null}

      <Button type="submit" isLoading={login.isPending} className="w-full">
        Sign in
      </Button>
    </form>
  );
}
