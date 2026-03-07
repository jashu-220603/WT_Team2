import { useEffect, useRef, useState } from "react";

const stats = [
  { label: "Total Complaints", target: 12485, color: "text-foreground" },
  { label: "Resolved", target: 10230, color: "text-green-600" },
  { label: "Pending", target: 2255, color: "text-accent" },
];

function useCountUp(target: number, duration = 2000) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) setStarted(true);
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const interval = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(interval);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(interval);
  }, [started, target, duration]);

  return { count, ref };
}

const StatsSection = () => {
  return (
    <section className="py-16 gov-gradient">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground font-serif">
            Complaint Statistics
          </h2>
          <div className="w-16 h-1 gold-gradient mx-auto mt-4 rounded-full" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
          {stats.map((stat) => {
            const { count, ref } = useCountUp(stat.target);
            return (
              <div
                key={stat.label}
                ref={ref}
                className="text-center p-6 rounded-xl bg-primary-foreground/5 border border-primary-foreground/10 backdrop-blur-sm"
              >
                <p className="text-4xl md:text-5xl font-bold text-accent font-serif">
                  {count.toLocaleString()}
                </p>
                <p className="text-sm text-primary-foreground/75 mt-2 font-medium uppercase tracking-wider">
                  {stat.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
