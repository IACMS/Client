import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-gutter text-on-surface font-body-md">
      <p className="font-label-caps text-secondary tracking-widest mb-2">404</p>
      <h1 className="font-h2 text-primary mb-2 text-center">Page not found</h1>
      <p className="text-secondary text-center max-w-md mb-xl">
        That URL is not part of this application. Use the links below to continue.
      </p>
      <div className="flex flex-wrap gap-md justify-center">
        <Link className="bg-primary-container text-white px-lg py-md rounded-lg font-semibold hover:opacity-90" to="/">
          Home
        </Link>
        <Link className="border border-outline px-lg py-md rounded-lg font-semibold text-primary-container hover:bg-slate-50" to="/login">
          Sign in
        </Link>
      </div>
    </div>
  );
}
