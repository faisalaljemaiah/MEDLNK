function timeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function HomeGreeting({ firstName }: { firstName: string | null }) {
  return (
    <div className="px-4 pt-5">
      <h1 className="font-headline text-xl text-text">
        {timeOfDayGreeting()}
        {firstName ? `, ${firstName}` : ""} <span aria-hidden>👋</span>
      </h1>
      <p className="mt-0.5 text-sm text-muted">
        Here&apos;s what&apos;s happening in your healthcare network today.
      </p>
    </div>
  );
}
