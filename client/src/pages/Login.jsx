import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../services/api";

function Login() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await API.post("/auth/login", formData);
      const { token, user } = response.data;

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      if (user.role === "admin") {
        navigate("/admin-dashboard");
      } else if (user.role === "organizer") {
        navigate("/dashboard");
      } else {
        navigate("/student-dashboard");
      }
    } catch (err) {
      setError(
        err.response?.data?.message || "Login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#100d1c] px-5 py-10 text-white">
      {/* Ambient background accents */}
      <div className="pointer-events-none absolute -left-40 top-[-8rem] h-[26rem] w-[26rem] rounded-full bg-violet-700/15 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-48 -right-32 h-[30rem] w-[30rem] rounded-full bg-fuchsia-700/10 blur-[130px]" />

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-[#171326] shadow-2xl shadow-black/30 lg:grid-cols-[1.05fr_0.95fr]">
        {/* Brand panel */}
        <section className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-[#302052] via-[#211936] to-[#171326] p-10 lg:flex xl:p-12">
          <div className="pointer-events-none absolute -right-24 top-24 h-72 w-72 rounded-full border border-violet-300/10" />
          <div className="pointer-events-none absolute -right-12 top-36 h-48 w-48 rounded-full border border-violet-300/10" />
          <div className="pointer-events-none absolute bottom-[-7rem] left-[-5rem] h-80 w-80 rounded-full bg-violet-500/10 blur-3xl" />

          <Link to="/" className="relative z-10 w-fit text-2xl font-bold tracking-tight">
            Explore<span className="text-violet-400">X.</span>
          </Link>

          <div className="relative z-10 my-16">
            <span className="inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-300/[0.08] px-3.5 py-2 text-xs font-semibold uppercase tracking-wider text-violet-200">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-300" />
              Discover something new
            </span>
            <h1 className="mt-7 max-w-md text-4xl font-bold leading-tight tracking-tight xl:text-5xl">
              Your next
              <br />
              <span className="text-violet-300">experience</span>
              <br />
              starts here.
            </h1>
            <p className="mt-6 max-w-sm text-base leading-7 text-slate-300/80">
              Find events worth attending, adventures worth taking, and people
              who share your interests.
            </p>
          </div>

          <p className="relative z-10 text-xs tracking-wide text-slate-400">
            DISCOVER. CONNECT. EXPERIENCE.
          </p>
        </section>

        {/* Login form */}
        <section className="px-6 py-9 sm:px-10 sm:py-12 lg:px-11 xl:px-14">
          <div className="mb-10 flex items-center justify-between lg:mb-12">
            <Link to="/" className="text-xl font-bold tracking-tight lg:hidden">
              Explore<span className="text-violet-400">X.</span>
            </Link>
            <Link
              to="/"
              className="ml-auto text-sm text-slate-400 transition hover:text-white"
            >
              Back to home <span aria-hidden="true">↗</span>
            </Link>
          </div>

          <div className="mx-auto w-full max-w-md">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-300">
              Welcome back
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Sign in to ExploreX
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Log in to discover events and manage your experiences.
            </p>

            <form onSubmit={handleSubmit} className="mt-9 space-y-6">
              <div>
                <label
                  htmlFor="email"
                  className="mb-2.5 block text-sm font-medium text-slate-300"
                >
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  className="w-full rounded-xl border border-white/10 bg-[#100d1c] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400/70 focus:ring-4 focus:ring-violet-500/10"
                />
              </div>

              <div>
                <div className="mb-2.5 flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-slate-300"
                  >
                    Password
                  </label>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                    className="w-full rounded-xl border border-white/10 bg-[#100d1c] px-4 py-3.5 pr-16 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400/70 focus:ring-4 focus:ring-violet-500/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500 transition hover:text-violet-300"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "HIDE" : "SHOW"}
                  </button>
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-500/20 bg-red-500/[0.08] px-4 py-3 text-sm leading-6 text-red-300"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-950/30 transition duration-200 hover:-translate-y-0.5 hover:bg-violet-500 focus:outline-none focus:ring-4 focus:ring-violet-500/20 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {loading ? "Signing in..." : "Sign in"}
                {!loading && <span aria-hidden="true">→</span>}
              </button>
            </form>

            <p className="mt-8 text-center text-sm text-slate-400">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="font-semibold text-violet-300 transition hover:text-violet-200"
              >
                Create an account
              </Link>
            </p>

            <div className="mt-9 border-t border-white/[0.07] pt-6 text-center">
              <p className="text-xs leading-5 text-slate-500">
                By continuing, you agree to use ExploreX responsibly and
                respectfully.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default Login;
