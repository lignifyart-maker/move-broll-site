import { useEffect, useMemo, useState } from "react";
import rawContent from "./content.json";
import type { ContentUnit, MediaAsset, Person, Reply, SiteContent } from "./types";

const content = rawContent as SiteContent;
const STORAGE_KEY = `${content.site.id}-reactions-v1`;

type ReactionMap = Record<string, { liked?: boolean; reposted?: boolean }>;

function assetPath(path: string) {
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`;
}

function Avatar({ person }: { person: Person }) {
  if (person.avatar.image) {
    return <img className="avatar" src={assetPath(person.avatar.image)} alt="" />;
  }
  return (
    <span
      className="avatar avatar-glyph"
      style={{ background: person.avatar.background, color: person.avatar.color }}
      aria-hidden="true"
    >
      {person.avatar.glyph}
    </span>
  );
}

function Identity({ person }: { person: Person }) {
  return (
    <span className="identity">
      <strong>{person.name}</strong>
      <span>{person.handle}</span>
      {person.role && <small>{person.role}</small>}
    </span>
  );
}

function ReplyTree({ replies, people }: { replies: Reply[]; people: Map<string, Person> }) {
  return (
    <div className="reply-tree">
      {replies.map((reply) => {
        const person = people.get(reply.authorId);
        if (!person) return null;
        return (
          <div className="reply" key={reply.id}>
            <Avatar person={person} />
            <div>
              <Identity person={person} />
              <p>{reply.body}</p>
              {reply.replies?.length ? <ReplyTree replies={reply.replies} people={people} /> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Gallery({ unit, onOpen }: { unit: ContentUnit; onOpen: (media: MediaAsset) => void }) {
  return (
    <div className={`gallery gallery-${Math.min(unit.media.length, 3)}`}>
      {unit.media.map((media) => (
        <button className="media-button" key={media.id} onClick={() => onOpen(media)}>
          <img
            src={assetPath(media.src)}
            alt={media.alt}
            width={media.width}
            height={media.height}
            loading="lazy"
          />
          {media.caption && <span>{media.caption}</span>}
        </button>
      ))}
    </div>
  );
}

export default function App() {
  const people = useMemo(() => new Map(content.people.map((person) => [person.id, person])), []);
  const [openUnits, setOpenUnits] = useState<Set<string>>(new Set());
  const [openReplies, setOpenReplies] = useState<Set<string>>(new Set());
  const [lightbox, setLightbox] = useState<MediaAsset | null>(null);
  const [reactions, setReactions] = useState<ReactionMap>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    } catch {
      return {};
    }
  });

  useEffect(() => {
    document.documentElement.style.setProperty("--accent", content.site.accent);
    const reveal = () => {
      const id = window.location.hash.slice(1);
      if (id) requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: "start" }));
    };
    reveal();
    window.addEventListener("hashchange", reveal);
    return () => window.removeEventListener("hashchange", reveal);
  }, []);

  useEffect(() => {
    if (!lightbox) return;
    const close = (event: KeyboardEvent) => event.key === "Escape" && setLightbox(null);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [lightbox]);

  function toggleSet(setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) {
    setter((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleReaction(id: string, key: "liked" | "reposted") {
    setReactions((current) => {
      const next = { ...current, [id]: { ...current[id], [key]: !current[id]?.[key] } };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // The static experience remains usable when storage is blocked.
      }
      return next;
    });
  }

  async function share(id: string) {
    const url = new URL(window.location.href);
    url.hash = id;
    try {
      await navigator.clipboard.writeText(url.toString());
    } catch {
      window.location.hash = id;
    }
  }

  return (
    <div className={`app format-${content.site.format}`}>
      <header className="site-header">
        <span className="logo-mark" aria-hidden="true">◆</span>
        <div>
          <h1>{content.site.title}</h1>
          {content.site.episode && <span>{content.site.episode}</span>}
        </div>
      </header>

      <main>
        <section className="hero">
          <p className="eyebrow">STATIC STORY · ORIGINAL SERIES</p>
          <h2>{content.site.title}</h2>
          <p>{content.site.subtitle}</p>
        </section>
        <p className="disclosure">{content.site.disclosure}</p>

        <section className="feed" aria-label="內容串">
          {content.units.map((unit) => {
            const author = people.get(unit.authorId);
            if (!author) return null;
            const expanded = openUnits.has(unit.id);
            const repliesExpanded = openReplies.has(unit.id);
            const reaction = reactions[unit.id] ?? {};
            return (
              <article className="unit" id={unit.id} key={unit.id}>
                <div className="avatar-lane">
                  <Avatar person={author} />
                  <span className="thread-line" aria-hidden="true" />
                </div>
                <div className="unit-body">
                  <header>
                    <Identity person={author} />
                    <span className="unit-time">{unit.label ?? unit.time}</span>
                  </header>
                  <p>{unit.body}</p>
                  {unit.prompt && <blockquote><small>提問／製作註記</small>{unit.prompt}</blockquote>}
                  <Gallery unit={unit} onOpen={setLightbox} />

                  <div className="actions" aria-label="互動">
                    <button aria-pressed={Boolean(reaction.liked)} onClick={() => toggleReaction(unit.id, "liked")}>♡ {unit.metrics?.likes ? unit.metrics.likes + (reaction.liked ? 1 : 0) : ""}</button>
                    <button onClick={() => toggleSet(setOpenUnits, unit.id)}>回應 {unit.metrics?.replies ?? ""}</button>
                    <button aria-pressed={Boolean(reaction.reposted)} onClick={() => toggleReaction(unit.id, "reposted")}>↻ {unit.metrics?.reposts ? unit.metrics.reposts + (reaction.reposted ? 1 : 0) : ""}</button>
                    <button onClick={() => share(unit.id)}>分享</button>
                  </div>

                  {unit.verdicts?.length ? (
                    <button className="expand" aria-expanded={expanded} onClick={() => toggleSet(setOpenUnits, unit.id)}>
                      {expanded ? "收起討論" : "查看評審／劇組討論"}<span>{expanded ? "−" : "+"}</span>
                    </button>
                  ) : null}

                  {expanded && unit.verdicts?.length ? (
                    <div className="verdicts">
                      {unit.verdicts.map((verdict) => {
                        const voice = people.get(verdict.authorId);
                        if (!voice) return null;
                        return (
                          <section className="verdict" key={verdict.id}>
                            <Avatar person={voice} />
                            <div>
                              <Identity person={voice} />
                              <h3>{verdict.score != null && <b>{verdict.score}</b>}{verdict.heading}</h3>
                              <p>{verdict.body}</p>
                              {verdict.lesson && <aside>{verdict.lesson}</aside>}
                            </div>
                          </section>
                        );
                      })}
                      {unit.replies?.length ? (
                        <>
                          <button className="reply-toggle" onClick={() => toggleSet(setOpenReplies, unit.id)}>
                            {repliesExpanded ? "收起回覆" : `查看 ${unit.replies.length} 則回覆`}
                          </button>
                          {repliesExpanded && <ReplyTree replies={unit.replies} people={people} />}
                        </>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </section>
      </main>

      <footer>有限內容 · 靜態封存 · 無執行期 AI 費用</footer>

      {lightbox && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label="圖片放大檢視" onClick={() => setLightbox(null)}>
          <button aria-label="關閉" onClick={() => setLightbox(null)}>×</button>
          <img src={assetPath(lightbox.src)} alt={lightbox.alt} width={lightbox.width} height={lightbox.height} onClick={(event) => event.stopPropagation()} />
        </div>
      )}
    </div>
  );
}

