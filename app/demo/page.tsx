import { ArrowRight } from "lucide-react";

export default function AnimatedButtonPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f5f0]">
      <button className="group relative h-16 overflow-hidden rounded-full bg-linear-to-t from-[#2a1a3a] via-[#1a1a2e] to-[#1a1a1a] px-8 pr-16 text-lg font-medium text-white transition-all duration-800 hover:bg-transparent hover:text-[#1a1a1a] border-2 border-transparent hover:border-[#1a1a1a]">
        {/* Background slide effect - expands from arrow circle position */}
        <span className="absolute right-2 top-1/2 -translate-y-1/2 h-12 w-12 bg-white rounded-full transition-all duration-800 ease-out group-hover:scale-[8] group-hover:right-1/2 group-hover:translate-x-1/2" />
        
        {/* Text */}
        <span className="relative z-10 transition-colors duration-150">
          Create Free Account
        </span>
        
        {/* Arrow circle */}
        <span className="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#1a1a1a]">
          <ArrowRight className="h-5 w-5" />
        </span>
      </button>
    </div>
  );
}
