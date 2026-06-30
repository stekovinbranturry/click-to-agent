interface FeatureCardProps {
  title: string;
  icon: string;
  description: string;
}

export function FeatureCard({ title, icon, description }: FeatureCardProps) {
  return (
    <article className="card">
      <div className="card-icon" aria-hidden>
        {icon}
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
    </article>
  );
}
