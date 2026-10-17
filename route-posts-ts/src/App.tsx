import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import Home from "./home.tsx";
import {
  signupUser,
  loginUser,
  type SignupPayload,
} from "./services/auth";

type AuthMode = "login" | "register";

const usernameRegex = /^[a-z0-9_]{3,30}$/;
const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s])\S+$/;

const normalInputClass =
  "w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200";

const errorInputClass =
  "w-full rounded-2xl border border-red-500 bg-red-50 px-5 py-4 outline-none transition focus:border-red-600 focus:ring-2 focus:ring-red-200";

function App() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("error");
const [isLoggedIn, setIsLoggedIn] = useState(
  Boolean(localStorage.getItem("token"))
);
  const [loginData, setLoginData] = useState({
    login: "",
    password: "",
  });

  const [usernameError, setUsernameError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");

  const [formData, setFormData] = useState<SignupPayload>({
    name: "",
    username: "",
    email: "",
    dateOfBirth: "",
    gender: "male",
    password: "",
    rePassword: "",
  });

  function handleChange(
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function handleUsernameChange(event: ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;

    setFormData((previous) => ({ ...previous, username: value }));
    setUsernameError(
      usernameRegex.test(value)
        ? ""
        : "Username must be 3-30 chars (a-z, 0-9, _)."
    );
  }

  function handlePasswordChange(event: ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;

    setFormData((previous) => ({ ...previous, password: value }));

    setPasswordError(
      passwordRegex.test(value)
        ? ""
        : "Password must include uppercase, lowercase, number, and special character."
    );

    setConfirmPasswordError(
      formData.rePassword && value !== formData.rePassword
        ? "Passwords do not match."
        : ""
    );
  }

  function handleConfirmPasswordChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const value = event.target.value;

    setFormData((previous) => ({ ...previous, rePassword: value }));

    setConfirmPasswordError(
      value === formData.password ? "" : "Passwords do not match."
    );
  }

  function resetErrors() {
    setUsernameError("");
    setPasswordError("");
    setConfirmPasswordError("");
    setMessage("");
  }

  function handleLogout() {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
    setMessage("");
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setLoading(true);
    

    try {
      const result = await loginUser(loginData);

      if (!result.data?.token) {
        throw new Error("No token was returned by the server.");
      }

      localStorage.setItem("token", result.data.token);
      setIsLoggedIn(true);
      setMessageType("success");
      setMessage(result.message || "Login successful!");
    } catch (error) {
      setMessageType("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    let hasError = false;

    if (!usernameRegex.test(formData.username)) {
      setUsernameError("Username must be 3-30 chars (a-z, 0-9, _).");
      hasError = true;
    }

    if (!passwordRegex.test(formData.password)) {
      setPasswordError(
        "Password must include uppercase, lowercase, number, and special character."
      );
      hasError = true;
    }

    if (formData.password !== formData.rePassword) {
      setConfirmPasswordError("Passwords do not match.");
      hasError = true;
    }
    
    if (hasError) return;

    setLoading(true);

    try {
      const result = await signupUser(formData);

      setFormData({
        name: "",
        username: "",
        email: "",
        dateOfBirth: "",
        gender: "male",
        password: "",
        rePassword: "",
      });

      resetErrors();
      setMode("login");
      setMessageType("success");
      setMessage(result.message || "Account created successfully!");
    } catch (error) {
      setMessageType("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
       } finally {
      setLoading(false);
    }
  }

 
  
if (isLoggedIn) {
  return <Home onLogout={handleLogout} />;
}

if (loading) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-slate-100">
      <div className="h-16 w-16 animate-spin rounded-full border-4 border-pink-200 border-t-pink-500" />

      <h1 className="text-3xl font-extrabold text-blue-900">
        Route Posts
      </h1>

      <p className="text-slate-600">
        {mode === "login"
          ? "Logging you in..."
          : "Creating your account..."}
      </p>
    </main>
  );
}

  

  
  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10 lg:px-12">
      <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-2">
        <section>
          <h1 className="text-5xl font-extrabold tracking-tight text-blue-900">
            Route Posts
          </h1>

          <p className="mt-5 max-w-2xl text-xl leading-relaxed text-slate-800">
            Connect with friends and the world around you on Route Posts.
          </p>

          <div className="mt-8 rounded-3xl border border-blue-200 bg-white/80 p-7 shadow-md">
            <p className="font-bold tracking-widest text-blue-900">
              ABOUT ROUTE ACADEMY
            </p>

            <h2 className="mt-4 text-xl font-bold text-slate-900">
              Egypt&apos;s Leading IT Training Center Since 2012
            </h2>

            <p className="mt-4 leading-8 text-slate-600">
              Route Academy is the premier IT training center in Egypt,
              established in 2012. We specialize in delivering high-quality
              training courses in programming, web development, and
              application development.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                ["2012", "FOUNDED"],
                ["40K+", "GRADUATES"],
                ["50+", "PARTNER COMPANIES"],
                ["5", "BRANCHES"],
                ["20", "DIPLOMAS AVAILABLE"],
              ].map(([number, label]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-blue-200 bg-blue-50 p-4"
                >
                  <p className="text-xl font-extrabold text-blue-900">
                    {number}
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-600">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-xl rounded-3xl bg-white p-6 shadow-sm sm:p-8">
          <div className="grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                resetErrors();
              }}
              className={`rounded-xl py-3 font-bold ${
                mode === "login"
                  ? "bg-white text-blue-900 shadow"
                  : "text-slate-600"
              }`}
            >
              Login
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("register");
                resetErrors();
              }}
              className={`rounded-xl py-3 font-bold ${
                mode === "register"
                  ? "bg-white text-blue-900 shadow"
                  : "text-slate-600"
              }`}
            >
              Register
            </button>
          </div>

          {message && (
            <div
              role="alert"
              className={`mt-5 rounded-xl p-4 text-sm ${
                messageType === "success"
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {message}
            </div>
          )}

          {mode === "register" ? (
            <div className="mt-7">
              <h2 className="text-3xl font-bold text-slate-900">
                Create a new account
              </h2>
              <p className="mt-2 text-lg text-slate-500">
                It is quick and easy.
              </p>

              <form onSubmit={handleSignup} className="mt-8 space-y-5">
                <input
                  name="name"
                  type="text"
                  placeholder="Full name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className={normalInputClass}
                />

                <div>
                  <input
                    name="username"
                    type="text"
                    placeholder="Username"
                    value={formData.username}
                    onChange={handleUsernameChange}
                    minLength={3}
                    maxLength={30}
                    pattern="[a-z0-9_]{3,30}"
                    required
                    aria-invalid={Boolean(usernameError)}
                    className={usernameError ? errorInputClass : normalInputClass}
                  />
                  {usernameError && (
                    <p className="mt-2 text-sm text-red-600">{usernameError}</p>
                  )}
                </div>

                <input
                  name="email"
                  type="email"
                  placeholder="Email address"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className={normalInputClass}
                />

                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  required
                  className={normalInputClass}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>

                <input
                  name="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  max={new Date().toISOString().split("T")[0]}
                  required
                  className={normalInputClass}
                />

                <div>
                  <input
                    name="password"
                    type="password"
                    placeholder="Password"
                    value={formData.password}
                    onChange={handlePasswordChange}
                    required
                    aria-invalid={Boolean(passwordError)}
                    className={
                      passwordError || confirmPasswordError
                        ? errorInputClass
                        : normalInputClass
                    }
                  />
                  {passwordError && (
                    <p className="mt-2 text-sm text-red-600">{passwordError}</p>
                  )}
                </div>

                <div>
                  <input
                    name="rePassword"
                    type="password"
                    placeholder="Confirm password"
                    value={formData.rePassword}
                    onChange={handleConfirmPasswordChange}
                    required
                    aria-invalid={Boolean(confirmPasswordError)}
                    className={
                      confirmPasswordError ? errorInputClass : normalInputClass
                    }
                  />
                  {confirmPasswordError && (
                    <p className="mt-2 text-sm text-red-600">
                      {confirmPasswordError}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-blue-900 py-5 text-lg font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Creating account..." : "Create New Account"}
                </button>
              </form>
            </div>
          ) : (
            <div className="mt-7">
              <h2 className="text-2xl font-extrabold text-slate-900">
                Log in to Route Posts
              </h2>
              <p className="mt-2 text-slate-500">
                Log in and continue your social journey.
              </p>

              <form onSubmit={handleLogin} className="mt-7 space-y-5">
                <input
                  name="login"
                  type="text"
                  placeholder="Email or username"
                  value={loginData.login}
                  onChange={(event) =>
                    setLoginData((previous) => ({
                      ...previous,
                      login: event.target.value,
                    }))
                  }
                  required
                  className={normalInputClass}
                />

                <input
                  name="password"
                  type="password"
                  placeholder="Password"
                  value={loginData.password}
                  onChange={(event) =>
                    setLoginData((previous) => ({
                      ...previous,
                      password: event.target.value,
                    }))
                  }
                  required
                  className={normalInputClass}
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-blue-900 py-5 text-lg font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Logging in..." : "Log In"}
                </button>
              </form>

              <button
                type="button"
                onClick={() => {
                  setMessageType("error");
                  setMessage("Forgot password is not connected yet.");
                }}
                className="mt-6 w-full text-center text-blue-900 hover:underline"
              >
                Forgot password?
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default App;
