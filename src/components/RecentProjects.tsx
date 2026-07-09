"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { projects } from "@/lib/projects";

export function RecentProjects() {
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
        {projects.map((project, i) => (
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
              {/* Плейсхолдер под фото работы — заменится на реальные картинки */}
              <div className="aspect-[4/3] bg-gradient-to-br from-emerald-500/20 via-zinc-200 to-zinc-100 transition-transform duration-300 group-hover:scale-105 dark:from-emerald-500/10 dark:via-zinc-800 dark:to-zinc-900" />
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
