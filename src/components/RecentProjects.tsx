"use client";

import { motion } from "motion/react";
import Link from "next/link";
import Image from "next/image";
import { projects } from "@/lib/projects";

export function RecentProjects() {
  const recent = projects.slice(0, 3);

  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <motion.h2
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-white"
      >
        Последние работы
      </motion.h2>
      <p className="mt-2 max-w-xl text-zinc-600 dark:text-zinc-400">
        Несколько последних проектов. Полный каталог — в разделе Portfolio.
      </p>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {recent.map((project, i) => (
          <motion.div
            key={project.slug}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
          >
            <Link
              href={`/portfolio/${project.slug}`}
              className="group block overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image
                  src={project.image}
                  alt={project.title}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <div className="p-5">
                <span className="text-xs font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                  {project.tag}
                </span>
                <h3 className="mt-1 font-semibold text-zinc-950 dark:text-white">
                  {project.title}
                </h3>
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                  {project.summary}
                </p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
