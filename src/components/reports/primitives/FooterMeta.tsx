"use client";

type FooterMetaProps = {
  text: string;
  className?: string;
};

export function FooterMeta({
  text,
  className = "mt-6 max-w-[34rem] text-[15px] leading-7 text-slate-400",
}: FooterMetaProps) {
  return <p className={className}>{text}</p>;
}
