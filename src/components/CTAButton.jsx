import { Link } from 'react-router-dom';

export default function CTAButton({ href = '/signin', className = '' }) {
  return (
    <Link
      to={href}
      className={`inline-flex items-center justify-center rounded-full px-9 py-4 text-lg font-semibold shadow-md transition-transform transition-shadow duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-cyan-300/60 hover:scale-105 hover:shadow-[0_10px_30px_-10px_rgba(34,211,238,0.55)] bg-black text-white ring-1 ring-white/15 ${className}`}
      aria-label="SignIn/SignUp"
    >
      SignIn / SignUp
    </Link>
  );
}


