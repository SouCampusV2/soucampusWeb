import Link from "next/link";
import { notFound } from "next/navigation";
import { type Project } from "@/lib/projects";
import { getAllProjectsForAdmin } from "@/lib/projects-admin";
import { getProduct, type Product } from "@/lib/products";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { SITE_URL } from "@/lib/site";
import { LocalTime } from "@/components/LocalTime";
import { BUTTON_COLORS, BUTTON_PILL, TOGGLE_PILL_COLORS } from "@/components/Button";
import { DiscordInbox } from "@/components/DiscordInbox";
import { DiscordPostEditor } from "@/components/DiscordPostEditor";
import { rowToInboxItem, type InboxRow } from "@/lib/discord-inbox";
import {
  absoluteUrl,
  CHANNEL_KEYS,
  channelForProduct,
  channelWebhook,
  draftFromProduct,
  draftFromProject,
  isShowcaseChannel,
  normalizeShowcasePost,
  CHANNEL_ROLES,
  SHOWCASE_CHANNELS,
  type ShowcaseChannel,
  type ShowcasePost,
} from "@/lib/discord-showcase";
import { getDiscordBotIdentity } from "@/lib/discord-identity";

// Новый пост по умолчанию пингует роль Portfolio (владелец, 26.10), а
// подписан именем и иконкой бота — их отдаёт Discord по вебхуку
// (discord-identity.ts). Подпись можно сменить в форме.

// Связка с Discord-ботом BoCampus (2026-10-27). Две вкладки:
//
//   Inbox    — что прислал бот (черновики работ, отзывы); ждёт решения.
//   Showcase — посты о работах в канал витрины через вебхук.
//
// Права проверяет layout админки (постороннему 404). Обе таблицы закрыты
// RLS без политик — читаем служебным ключом, пишем через свои
// обработчики /api/admin/discord и /api/admin/discord/showcase.
export const dynamic = "force-dynamic";

type PostRow = {
  id: string;
  project_slug: string | null;
  product_slug: string | null;
  channel: string;
  post: unknown;
  status: "draft" | "published";
  published_at: string | null;
  updated_at: string;
};

export default async function AdminDiscordPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; post?: string; from?: string; product?: string; channel?: string }>;
}) {
  const { tab, post: postId, from, product: productParam, channel: channelParam } = await searchParams;
  // ?channel=… — пункты навбара Discord → Portfolio / Premade / Free.
  const channelFilter = isShowcaseChannel(channelParam) ? channelParam : null;
  const showcase = tab === "showcase";
  const db = getSupabaseAdmin();
  // Какие каналы готовы к публикации. В браузер уходят только да/нет —
  // ссылка вебхука сама по себе право писать в канал.
  const webhooks = Object.fromEntries(
    CHANNEL_KEYS.map((key) => [key, Boolean(channelWebhook(key))])
  ) as Record<ShowcaseChannel, boolean>;

  // Счётчик на вкладке Inbox — виден и со второй вкладки.
  const { data: inboxRows, error: inboxError } = await db
    .from("discord_inbox")
    .select("key, kind, payload, image_urls, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (inboxError) console.warn(`discord_inbox недоступна: ${inboxError.message}`);
  const inbox = ((inboxRows ?? []) as InboxRow[]).map(rowToInboxItem);

  // Редактор поста: ?post=<id> — сохранённый, ?from=<slug> — новый из
  // работы (Portfolio), ?product=<slug> — новый из карты (Premade / Free).
  if (showcase && (postId || from || productParam)) {
    const projects = await getAllProjectsForAdmin();
    let editor: {
      id: string | null;
      projectSlug: string | null;
      productSlug: string | null;
      channel: ShowcaseChannel;
      status: "draft" | "published";
      post: ShowcasePost;
    };
    if (postId) {
      const { data } = await db
        .from("discord_posts")
        .select("id, project_slug, product_slug, channel, post, status, published_at, updated_at")
        .eq("id", postId)
        .maybeSingle();
      const row = data as PostRow | null;
      // Через перевод: пост первого редактора (эмбед) тоже открывается.
      const post = row ? normalizeShowcasePost(row.post) : null;
      if (!row || !post) notFound();
      editor = {
        id: row.id,
        projectSlug: row.project_slug,
        productSlug: row.product_slug,
        channel: isShowcaseChannel(row.channel) ? row.channel : "portfolio",
        status: row.status,
        post,
      };
    } else if (productParam) {
      const product = await getProduct(productParam);
      if (!product) notFound();
      const channel = channelForProduct(product);
      editor = {
        id: null,
        projectSlug: null,
        productSlug: product.slug,
        channel,
        status: "draft",
        post: {
          ...draftFromProduct(productForPost(product), SITE_URL),
          ...(await getDiscordBotIdentity(channelWebhook(channel) ?? channelWebhook("portfolio"))),
          // Роль своего канала — по умолчанию, как @Portfolio у работ.
          mention: "role",
          roleId: CHANNEL_ROLES[channel].id,
        },
      };
    } else {
      const project = projects.find((p) => p.slug === from);
      if (!project) notFound();
      editor = {
        id: null,
        projectSlug: project.slug,
        productSlug: null,
        channel: "portfolio",
        status: "draft",
        post: {
          ...draftFromProject(projectForPost(project), SITE_URL),
          ...(await getDiscordBotIdentity(channelWebhook("portfolio"))),
          mention: "role",
          roleId: CHANNEL_ROLES.portfolio.id,
        },
      };
    }
    const project = projects.find((p) => p.slug === editor.projectSlug);
    const product = editor.productSlug ? await getProduct(editor.productSlug) : null;
    const imageChoices = (
      project ? [project.image, ...(project.gallery ?? [])] : product?.images ?? []
    ).flatMap((url) => {
      const absolute = absoluteUrl(url, SITE_URL);
      return absolute ? [absolute] : [];
    });

    return (
      <Shell showcase inboxCount={inbox.length}>
        <Link href="/admin/discord?tab=showcase" className="mt-6 inline-block text-sm font-medium text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50">
          ← All posts
        </Link>
        <div className="mt-6">
          <DiscordPostEditor
            // key — новый пост и сохранённый не делят состояние формы.
            key={editor.id ?? `new-${editor.projectSlug ?? editor.productSlug}`}
            id={editor.id}
            projectSlug={editor.projectSlug}
            productSlug={editor.productSlug}
            initialChannel={editor.channel}
            status={editor.status}
            initialPost={editor.post}
            imageChoices={imageChoices}
            webhooks={webhooks}
          />
        </div>
      </Shell>
    );
  }

  if (!showcase) {
    return (
      <Shell showcase={false} inboxCount={inbox.length}>
        <DiscordInbox items={inbox} />
      </Shell>
    );
  }

  const [projects, { data: postRows, error: postsError }] = await Promise.all([
    getAllProjectsForAdmin(),
    db
      .from("discord_posts")
      .select("id, project_slug, product_slug, channel, post, status, published_at, updated_at")
      .order("updated_at", { ascending: false }),
  ]);
  if (postsError) console.warn(`discord_posts недоступна: ${postsError.message}`);
  const posts = ((postRows ?? []) as PostRow[]).flatMap((row) => {
    const post = normalizeShowcasePost(row.post);
    if (!post) return [];
    if (channelFilter && (isShowcaseChannel(row.channel) ? row.channel : "portfolio") !== channelFilter) return [];
    return [{ ...row, post }];
  });

  return (
    <Shell showcase inboxCount={inbox.length}>
      {CHANNEL_KEYS.some((key) => !webhooks[key]) && (
        <div className="mt-6 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800 dark:border-orange-900 dark:bg-orange-950/30 dark:text-orange-200">
          <p>
            Some channels can&apos;t be posted to yet. In Discord run{" "}
            <code className="font-mono">/setup site_channel</code> (the bot replies with a link
            only you can see) and put the link on Vercel. Drafts work without it.
          </p>
          <ul className="mt-2 list-disc pl-5">
            {CHANNEL_KEYS.filter((key) => !webhooks[key]).map((key) => (
              <li key={key}>
                {SHOWCASE_CHANNELS[key].label}:{" "}
                <code className="font-mono">kind:{SHOWCASE_CHANNELS[key].setupKind}</code> →{" "}
                <code className="font-mono">{SHOWCASE_CHANNELS[key].envVar}</code>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Новый пост — из работы портфолио. Список, а не выпадашка:
          нативного <select> на сайте нет (06.09), а с картинкой работу
          узнаёшь быстрее, чем по названию. */}
      <details className="group mt-6 rounded-3xl border border-zinc-200 bg-[#fbfbff] dark:border-zinc-800 dark:bg-zinc-950">
        <summary className={`m-4 w-fit list-none ${BUTTON_PILL} ${BUTTON_COLORS.primary}`}>
          New post from a work
        </summary>
        <p className="px-4 pb-2 text-xs text-zinc-500 dark:text-zinc-400">
          Goes to Portfolio. A post about a map starts from its row in{" "}
          <Link href="/admin/products" className="underline">
            Catalog
          </Link>{" "}
          → Post to Discord.
        </p>
        <ul className="grid gap-2 px-4 pb-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <li key={project.slug}>
              <Link
                href={`/admin/discord?tab=showcase&from=${encodeURIComponent(project.slug)}`}
                className="flex items-center gap-3 rounded-2xl p-2 transition-colors hover:bg-zinc-950/[0.04] dark:hover:bg-zinc-50/[0.05]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={project.image} alt="" className="h-10 w-14 shrink-0 rounded-lg object-cover" />
                <span className="truncate text-sm font-medium text-zinc-950 dark:text-zinc-50">
                  {project.title}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </details>

      {channelFilter && (
        <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">
          Showing {SHOWCASE_CHANNELS[channelFilter].label} only.{" "}
          <Link href="/admin/discord?tab=showcase" className="underline">
            All channels
          </Link>
        </p>
      )}

      {posts.length === 0 ? (
        <p className="mt-8 text-sm text-zinc-500 dark:text-zinc-400">No posts yet.</p>
      ) : (
        <ul className="mt-8 divide-y divide-zinc-200 rounded-3xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {posts.map((row) => {
            const post: ShowcasePost = row.post;
            return (
              <li key={row.id}>
                <Link
                  href={`/admin/discord?tab=showcase&post=${row.id}`}
                  className="flex items-center gap-4 p-4 transition-colors hover:bg-zinc-950/[0.03] dark:hover:bg-zinc-50/[0.03]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-zinc-950 dark:text-zinc-50">
                      {post.title || "Untitled"}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                      {SHOWCASE_CHANNELS[isShowcaseChannel(row.channel) ? row.channel : "portfolio"].label}
                      {" · "}
                      {row.status === "published" && row.published_at ? (
                        <>Published <LocalTime value={row.published_at} /></>
                      ) : (
                        <>Edited <LocalTime value={row.updated_at} /></>
                      )}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                      row.status === "published"
                        ? "bg-lime-100 text-lime-800 dark:bg-lime-950 dark:text-lime-300"
                        : "bg-zinc-950/[0.05] text-zinc-600 dark:bg-zinc-50/[0.06] dark:text-zinc-400"
                    }`}
                  >
                    {row.status === "published" ? "In Discord" : "Draft"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Shell>
  );
}

function projectForPost(project: Project) {
  return {
    slug: project.slug,
    title: project.title,
    summary: project.summary,
    image: project.image,
    gallery: project.gallery,
    sizeLabel: project.size,
    deadlineLabel: project.deadline,
    listingUrl: project.listingUrl,
    listingIsFree: project.listingIsFree,
  };
}

function productForPost(product: Product) {
  return {
    slug: product.slug,
    title: product.title,
    summary: product.summary,
    images: product.images,
    price: product.price,
    priceCents: product.priceCents,
    mapSize: product.specs.mapSize,
    mcVersions: product.specs.mcVersions,
  };
}

function Shell({
  showcase,
  inboxCount,
  children,
}: {
  showcase: boolean;
  inboxCount: number;
  children: React.ReactNode;
}) {
  const tabs = [
    { href: "/admin/discord", label: `Inbox${inboxCount > 0 ? ` (${inboxCount})` : ""}`, on: !showcase },
    { href: "/admin/discord?tab=showcase", label: "Showcase", on: showcase },
  ];
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
        Discord
      </h1>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        {showcase
          ? "Posts about your works and maps in the Portfolio, Premade and Free channels."
          : "Builds and reviews clients agreed to share through the bot."}
      </p>
      <nav className="mt-6 flex gap-2">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              t.on ? TOGGLE_PILL_COLORS.on : TOGGLE_PILL_COLORS.off
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
