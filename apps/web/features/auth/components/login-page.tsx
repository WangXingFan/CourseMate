"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SpinnerLabel } from "@/components/ui/spinner";
import { PASSWORD_MIN_LENGTH } from "@/shared/auth/account-policy";
import { useAuthLoginPage } from "@/features/auth/hooks/use-auth-login-page";
import { AppLogo } from "@/shared/components/app-logo";
import { IdentityProviderIcon } from "@/entities/identity-provider";
import { CustomBrandAttribution } from "@/shared/components/powered-by-coursemate";
import { LoginHero } from "@/features/auth/components/shared/login-hero";
import { TurnstileWidget } from "@/features/auth/components/shared/turnstile-widget";
import { cn } from "@/lib/utils";

type LoginPageProps = {
  nextPath: string;
};

function LoginBrandMark() {
  return (
    <AppLogo
      width={32}
      height={32}
      priority
      className="h-8 w-auto"
    />
  );
}

export function LoginPage({ nextPath }: LoginPageProps) {
  const t = useTranslations("login");
  const loginPage = useAuthLoginPage({ nextPath });
  const {
    cancelTwoFactorChallenge,
    canShowRegisterSwitch,
    codeSent,
    openRegisterInBrowser,
    registerNeedsBrowser,
    configReady,
    emailRegistrationEnabled,
    emailVerificationEnabled,
    handleProviderLogin,
    loginProviders,
    mode,
    onLoginSubmit,
    onRegisterSubmit,
    options,
    password,
    passwordLoginEnabled,
    passwordResetEnabled,
    registerCode,
    registerCodeCooldownSeconds,
    registerDebugCode,
    registerEmail,
    registerPassword,
    registerTurnstileRequired,
    registerTurnstileResetSignal,
    registerTurnstileSiteKey,
    registerTurnstileToken,
    requestRegisterCode,
    requestPasswordResetCode,
    requestTwoFactorEmailCode,
    resetCode,
    resetCodeCooldownSeconds,
    resetCodeSent,
    resetEmail,
    resetPassword,
    sendingCode,
    setPassword,
    setRegisterCode,
    setRegisterPassword,
    setRegisterTurnstileToken,
    setResetCode,
    setResetPassword,
    setTwoFactorCode,
    switchTwoFactorVerificationMethod,
    setUsername,
    submitting,
    toggleLoginMode,
    twoFactorChallengeToken,
    twoFactorCode,
    twoFactorEmailCodeCooldownSeconds,
    twoFactorEmailDebugCode,
    twoFactorVerificationMethod,
    twoFactorVerificationMethods,
    updateResetEmail,
    updateRegisterEmail,
    username,
    onPasswordResetSubmit,
  } = loginPage;

  const accountLabel = options.emailEnabled && options.usernameEnabled
    ? t("account")
    : options.emailEnabled
      ? t("email")
      : t("username");
  const accountPlaceholder = options.emailEnabled && options.usernameEnabled
    ? t("emailOrUsername")
    : options.emailEnabled
      ? t("email")
      : t("username");
  const alternativeTwoFactorMethod = twoFactorVerificationMethods.find((method) => method !== twoFactorVerificationMethod && method !== "none");
  const twoFactorUsesEmail = twoFactorVerificationMethod === "email";
  const heading = mode === "register"
    ? { title: t("hero.registerTitle"), hint: t("hero.registerHint") }
    : mode === "reset-password"
      ? { title: t("hero.resetTitle"), hint: t("hero.resetHint") }
      : twoFactorChallengeToken
        ? { title: t("hero.twoFactorTitle"), hint: t("hero.twoFactorHint") }
        : { title: t("hero.welcome"), hint: t("hero.welcomeHint") };

  return (
    <main className="grid min-h-screen text-foreground lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]" aria-busy={!configReady}>
      <LoginHero />
      <div className="flex min-h-screen flex-col px-6 py-8 sm:px-10">
      <LoginBrandMark />
      <div className="mx-auto my-auto w-full max-w-[380px] py-10">
        <header>
          <h2 className="font-display text-[2.125rem] leading-tight font-normal tracking-[-0.01em]">{heading.title}</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{heading.hint}</p>
        </header>

        <div
          aria-hidden={!configReady}
          className={cn(
            "grid transition-[grid-template-rows,opacity] duration-200 ease-out",
            configReady ? "grid-rows-[1fr] opacity-100" : "pointer-events-none grid-rows-[0fr] opacity-0",
          )}
        >
          {configReady ? (
            <div className="min-h-0 overflow-hidden px-0.5 pb-1">
            {mode === "login" && twoFactorChallengeToken ? (
              <>
                <form className="mt-9 space-y-5" onSubmit={onLoginSubmit}>
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none text-foreground/85" htmlFor="otp">
                      {twoFactorUsesEmail ? t("verificationCode") : t("twoFactorCode")}
                    </label>
                    <div className="flex gap-2">
                      <Input
                        id="otp"
                        name="otp"
                        type="text"
                        inputMode={twoFactorUsesEmail ? "numeric" : "text"}
                        autoComplete="one-time-code"
                        pattern={twoFactorUsesEmail ? "[0-9]*" : undefined}
                        className="h-11 min-w-0"
                        placeholder={twoFactorUsesEmail ? t("verificationCodePlaceholder") : t("twoFactorPlaceholder")}
                        value={twoFactorCode}
                        onChange={(event) => setTwoFactorCode(event.target.value)}
                        required
                      />
                      {twoFactorUsesEmail ? (
                        <Button
                          type="button"
                          variant="secondary"
                          className="h-11 min-w-[5.5rem] shrink-0 rounded-md border border-input/70 bg-transparent px-3 text-sm font-medium text-foreground shadow-none hover:bg-accent"
                          disabled={sendingCode || twoFactorEmailCodeCooldownSeconds > 0}
                          onClick={() => {
                            void requestTwoFactorEmailCode();
                          }}
                        >
                          {sendingCode ? <SpinnerLabel>{t("sending")}</SpinnerLabel> : twoFactorEmailCodeCooldownSeconds > 0 ? t("resendIn", { seconds: twoFactorEmailCodeCooldownSeconds }) : t("send")}
                        </Button>
                      ) : null}
                    </div>
                    {twoFactorEmailDebugCode ? <p className="text-xs font-medium text-muted-foreground">{t("debugCode", { code: twoFactorEmailDebugCode })}</p> : null}
                  </div>
                  <Button
                    className="mt-1 h-11 w-full rounded-md bg-primary text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/92"
                    type="submit"
                    disabled={submitting}
                  >
                    {submitting ? <SpinnerLabel>{t("signingIn")}</SpinnerLabel> : t("verifyAndSignIn")}
                  </Button>
                </form>
                {alternativeTwoFactorMethod ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="mt-2 h-10 w-full text-sm text-muted-foreground shadow-none"
                    onClick={() => switchTwoFactorVerificationMethod(alternativeTwoFactorMethod)}
                  >
                    {alternativeTwoFactorMethod === "email" ? t("useEmailVerification") : t("useTwoFactorVerification")}
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  className="mt-2 h-10 w-full text-sm text-muted-foreground shadow-none"
                  onClick={cancelTwoFactorChallenge}
                >
                  {passwordLoginEnabled ? t("backToPasswordLogin") : t("backToLoginMethods")}
                </Button>
              </>
            ) : null}

            {mode === "login" && !twoFactorChallengeToken && passwordLoginEnabled ? (
              <form className="mt-9 space-y-5" onSubmit={onLoginSubmit}>
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none text-foreground/85" htmlFor="username">
                    {accountLabel}
                  </label>
                  <Input
                    id="username"
                    name="username"
                    autoComplete="username"
                    className="h-11"
                    placeholder={accountPlaceholder}
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-sm font-medium leading-none text-foreground/85" htmlFor="password">
                      {t("password")}
                    </label>
                    {passwordResetEnabled ? (
                      <button
                        type="button"
                        className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:text-foreground focus-visible:underline focus-visible:outline-none"
                        onClick={() => {
                          updateResetEmail(username.includes("@") ? username : "");
                          loginPage.setMode("reset-password");
                        }}
                      >
                        {t("forgotPassword")}
                      </button>
                    ) : null}
                  </div>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    className="h-11"
                    placeholder={t("password")}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                </div>
                <Button
                  className="mt-2 h-11 w-full rounded-md bg-primary text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/92"
                  type="submit"
                  disabled={submitting}
                >
                  {submitting ? <SpinnerLabel>{t("signingIn")}</SpinnerLabel> : t("signIn")}
                </Button>
              </form>
            ) : null}

            {mode === "reset-password" && passwordResetEnabled ? (
              <>
                <form className="mt-9 space-y-5" onSubmit={onPasswordResetSubmit}>
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none text-foreground/85" htmlFor="reset-email">
                      {t("email")}
                    </label>
                    <Input
                      id="reset-email"
                      type="email"
                      autoComplete="email"
                      className="h-11"
                      placeholder={t("email")}
                      value={resetEmail}
                      onChange={(event) => updateResetEmail(event.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none text-foreground/85" htmlFor="reset-password">
                      {t("newPassword")}
                    </label>
                    <Input
                      id="reset-password"
                      type="password"
                      autoComplete="new-password"
                      className="h-11"
                      placeholder={t("newPasswordPlaceholder")}
                      value={resetPassword}
                      onChange={(event) => setResetPassword(event.target.value)}
                      minLength={PASSWORD_MIN_LENGTH}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none text-foreground/85" htmlFor="reset-code">
                      {t("verificationCode")}
                    </label>
                    <div className="flex gap-2">
                      <Input
                        id="reset-code"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        className="h-11"
                        placeholder={t("verificationCodePlaceholder")}
                        value={resetCode}
                        onChange={(event) => setResetCode(event.target.value)}
                        required
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-11 min-w-[5.5rem] shrink-0 rounded-md border border-input/70 bg-transparent px-3 text-sm font-medium text-foreground shadow-none hover:bg-accent"
                        disabled={sendingCode || resetCodeCooldownSeconds > 0 || !resetEmail.trim()}
                        onClick={() => {
                          void requestPasswordResetCode();
                        }}
                      >
                        {sendingCode ? <SpinnerLabel>{t("sending")}</SpinnerLabel> : resetCodeCooldownSeconds > 0 ? t("resendIn", { seconds: resetCodeCooldownSeconds }) : resetCodeSent ? t("resend") : t("send")}
                      </Button>
                    </div>
                  </div>
                  <Button
                    className="mt-1 h-11 w-full rounded-md bg-primary text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/92"
                    type="submit"
                    disabled={submitting || resetCode.length !== 6}
                  >
                    {submitting ? <SpinnerLabel>{t("resettingPassword")}</SpinnerLabel> : t("resetPassword")}
                  </Button>
                </form>
                <div className="mt-8 border-t border-border pt-6 text-sm leading-5 text-muted-foreground">
                  {t("rememberPassword")}{" "}
                  <button
                    type="button"
                    className="font-medium text-primary underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
                    onClick={() => loginPage.setMode("login")}
                  >
                    {t("back")}
                  </button>
                </div>
              </>
            ) : null}

            {mode === "register" && emailRegistrationEnabled ? (
              <form className="mt-9 space-y-5" onSubmit={onRegisterSubmit}>
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none text-foreground/85" htmlFor="register-email">
                    {t("email")}
                  </label>
                  <Input
                    id="register-email"
                    type="email"
                    autoComplete="email"
                    className="h-11"
                    placeholder={t("email")}
                    value={registerEmail}
                    onChange={(event) => updateRegisterEmail(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none text-foreground/85" htmlFor="register-password">
                    {t("password")}
                  </label>
                  <Input
                    id="register-password"
                    type="password"
                    autoComplete="new-password"
                    className="h-11"
                    placeholder={t("newPasswordPlaceholder")}
                    value={registerPassword}
                    onChange={(event) => setRegisterPassword(event.target.value)}
                    minLength={PASSWORD_MIN_LENGTH}
                    required
                  />
                </div>
                {registerTurnstileRequired ? (
                  <TurnstileWidget
                    siteKey={registerTurnstileSiteKey}
                    resetSignal={registerTurnstileResetSignal}
                    onTokenChange={setRegisterTurnstileToken}
                  />
                ) : null}
                {emailVerificationEnabled ? (
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none text-foreground/85" htmlFor="register-code">
                      {t("verificationCode")}
                    </label>
                    <div className="flex gap-2">
                      <Input
                        id="register-code"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        className="h-11"
                        placeholder={t("verificationCodePlaceholder")}
                        value={registerCode}
                        onChange={(event) => setRegisterCode(event.target.value)}
                        required
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-11 min-w-[5.5rem] shrink-0 rounded-md border border-input/70 bg-transparent px-3 text-sm font-medium text-foreground shadow-none hover:bg-accent"
                        disabled={sendingCode || registerCodeCooldownSeconds > 0 || !registerEmail.trim() || (registerTurnstileRequired && !registerTurnstileToken)}
                        onClick={() => {
                          void requestRegisterCode();
                        }}
                      >
                        {sendingCode ? <SpinnerLabel>{t("sending")}</SpinnerLabel> : registerCodeCooldownSeconds > 0 ? t("resendIn", { seconds: registerCodeCooldownSeconds }) : codeSent ? t("resend") : t("send")}
                      </Button>
                    </div>
                  </div>
                ) : null}
                {registerDebugCode ? <p className="text-xs font-medium text-muted-foreground">{t("debugCode", { code: registerDebugCode })}</p> : null}
                <Button
                  className="mt-1 h-11 w-full rounded-md bg-primary text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/92"
                  type="submit"
                  disabled={submitting || (emailVerificationEnabled && registerCode.length !== 6) || (registerTurnstileRequired && !registerTurnstileToken)}
                >
                  {submitting ? <SpinnerLabel>{t("registering")}</SpinnerLabel> : t("register")}
                </Button>
              </form>
            ) : null}

            {mode === "login" && !twoFactorChallengeToken && loginProviders.length > 0 ? (
              <div className={cn("space-y-2.5", passwordLoginEnabled ? "mt-6" : "mt-9")}>
                {passwordLoginEnabled ? (
                  <div className="flex items-center gap-3 pb-2.5 text-xs text-muted-foreground" aria-hidden>
                    <span className="h-px flex-1 bg-border" />
                    {t("hero.or")}
                    <span className="h-px flex-1 bg-border" />
                  </div>
                ) : null}
                {loginProviders.map((provider) => (
                  <Button
                    key={provider.publicID}
                    type="button"
                    variant="secondary"
                    className="h-11 w-full rounded-md border border-input/70 bg-pure text-sm font-medium text-foreground shadow-none hover:bg-accent"
                    onClick={() => {
                      void handleProviderLogin(provider.slug);
                    }}
                  >
                    <span className="inline-flex min-w-0 items-center justify-center gap-2">
                      <IdentityProviderIcon
                        name={provider.name}
                        slug={provider.slug}
                        logoURL={provider.logoURL}
                        className="size-5"
                        iconClassName="size-5"
                        fallbackClassName="text-sm font-semibold uppercase text-foreground"
                      />
                      <span className="truncate">{t("providerLogin", { provider: provider.name })}</span>
                    </span>
                  </Button>
                ))}
              </div>
            ) : null}

            {registerNeedsBrowser && mode === "login" ? (
              <div className="mt-8 border-t border-border pt-6 text-sm leading-5 text-muted-foreground">
                {t("noAccount")}{" "}
                <button
                  type="button"
                  className="font-medium text-primary underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
                  onClick={openRegisterInBrowser}
                >
                  {t("registerInBrowser")}
                </button>
              </div>
            ) : null}

            {canShowRegisterSwitch && mode !== "reset-password" ? (
              <div className="mt-8 border-t border-border pt-6 text-sm leading-5 text-muted-foreground">
                {mode === "register" ? t("alreadyHaveAccount") : t("noAccount")}{" "}
                <button
                  type="button"
                  className="font-medium text-primary underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
                  onClick={toggleLoginMode}
                >
                  {mode === "register" ? t("signIn") : t("register")}
                </button>
              </div>
            ) : null}
            </div>
          ) : null}
        </div>

      </div>
      </div>

      <CustomBrandAttribution className="fixed bottom-4 right-4" />
    </main>
  );
}
