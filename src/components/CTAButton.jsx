import { Link } from 'react-router-dom';

export default function CTAButton({ href = '/signin', className = '' }) {
  return (
    <Link
      to={href}
      className={`inline-flex items-center justify-center px-8 py-4 text-lg font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-500/60 bg-zinc-800 text-white ring-1 ring-zinc-700 ${className}`}
      aria-label="Sign in or sign up"
    >
      SignIn / SignUp
    </Link>
  );
}


