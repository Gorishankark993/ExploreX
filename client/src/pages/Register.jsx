import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../services/api";

function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "student",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      const response = await API.post("/auth/register", {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
      });

      const { token, user } = response.data;

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      API.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      navigate(user.role === "organizer" ? "/dashboard" : "/events");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#100d1c] px-5 py-10 text-white">
      <div className="pointer-events-none absolute -left-40 top-[-8rem] h-[26rem] w-[26rem] rounded-full bg-violet-700/15 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-48 -right-32 h-[30rem] w-[30rem] rounded-full bg-fuchsia-700/10 blur-[130px]" />

      <div className="relative grid w-full max-w-6xl overflow-hidden rounded-3xl border border-white/10 bg-[#171326] shadow-2xl shadow-black/30 lg:grid-cols-[0.9fr_1.1fr]">
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
              Your next experience awaits
            </span>

            <h1 className="mt-7 max-w-md text-4xl font-bold leading-tight tracking-tight xl:text-5xl">
              Make room
              <br />
              for <span className="text-violet-300">something</span>
              <br />
              unforgettable.
            </h1>

            <p className="mt-6 max-w-sm text-base leading-7 text-slate-300/80">
              Join a community of explorers. Discover events, meet people,
              and turn your interests into experiences.
            </p>
          </div>

          <p className="relative z-10 text-xs tracking-wide text-slate-400">
            DISCOVER. CONNECT. EXPERIENCE.
          </p>
        </section>

        {/* Registration form */}
        <section className="px-6 py-9 sm:px-10 sm:py-12 lg:px-11 xl:px-14">
          <div className="mb-8 flex items-center justify-between">
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
              Get started
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Create your account
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Sign up to discover events and plan your next experience.
            </p>

            {error && (
              <div
                role="alert"
                className="mt-6 rounded-xl border border-red-500/20 bg-red-500/[0.08] px-4 py-3 text-sm leading-6 text-red-300"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Full name
                </label>
                <input
                  id="name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  autoComplete="name"
                  required
                  className="w-full rounded-xl border border-white/10 bg-[#100d1c] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400/70 focus:ring-4 focus:ring-violet-500/10"
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-slate-300"
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
                <label
                  htmlFor="role"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  I want to join as
                </label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-white/10 bg-[#100d1c] px-4 py-3.5 text-sm text-white outline-none transition focus:border-violet-400/70 focus:ring-4 focus:ring-violet-500/10"
                >
                  <option value="student">Participant</option>
                  <option value="organizer">Event Organizer</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Create a password"
                    autoComplete="new-password"
                    minLength={6}
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

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Confirm password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Enter your password again"
                    autoComplete="new-password"
                    required
                    className="w-full rounded-xl border border-white/10 bg-[#100d1c] px-4 py-3.5 pr-16 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400/70 focus:ring-4 focus:ring-violet-500/10"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword((current) => !current)
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500 transition hover:text-violet-300"
                    aria-label={
                      showConfirmPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showConfirmPassword ? "HIDE" : "SHOW"}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-950/30 transition duration-200 hover:-translate-y-0.5 hover:bg-violet-500 focus:outline-none focus:ring-4 focus:ring-violet-500/20 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {loading ? "Creating account..." : "Create account"}
                {!loading && <span aria-hidden="true">→</span>}
              </button>
            </form>

            <p className="mt-7 text-center text-sm text-slate-400">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-semibold text-violet-300 transition hover:text-violet-200"
              >
                Sign in
              </Link>
            </p>

            <div className="mt-8 border-t border-white/[0.07] pt-5 text-center">
              <p className="text-xs leading-5 text-slate-500">
                By creating an account, you agree to use ExploreX responsibly
                and respectfully.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default Register;
