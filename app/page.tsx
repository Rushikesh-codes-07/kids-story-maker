"use client";
import { useRef, useState } from "react";
import { LANGUAGES, INTERESTS, LESSONS } from "./options";

type Pg = { text: string; emoji: string };
type Story = { title: string; pages: Pg[] };

const scenes = [
  "from-amber-100 to-orange-200",
  "from-sky-100 to-indigo-200",
  "from-emerald-100 to-teal-200",
  "from-rose-100 to-purple-200",
  "from-yellow-100 to-amber-300",
  "from-indigo-200 to-slate-300",
];
const roman = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
const face = {
  backfaceVisibility: "hidden",
  WebkitBackfaceVisibility: "hidden",
} as const;

function Art({ p, i }: { p: Pg; i: number }) {
  return (
    <div className={`relative flex h-full w-full flex-col items-center justify-center bg-gradient-to-br ${scenes[i % scenes.length]}`}>
      <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-black/20 to-transparent" />
      <span className="mb-3 font-serif text-xs uppercase tracking-[0.3em] text-stone-600">Chapter {roman[i]}</span>
      <div className="art" style={{ fontSize: "clamp(3rem,10vw,7.5rem)" }}>{p.emoji}</div>
    </div>
  );
}

function Words({ p, n, rtl }: { p: Pg; n: number; rtl: boolean }) {
  return (
    <div dir={rtl ? "rtl" : "ltr"} className="relative flex h-full w-full flex-col justify-center bg-[#fbf6ea]" style={{ padding: "9% 10%" }}>
      <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-black/15 to-transparent" />
      <p className="font-serif leading-relaxed text-stone-800" style={{ fontSize: "clamp(.8rem,1.9vw,1.4rem)" }}>
        {p.text}
      </p>
      <span className="absolute bottom-[5%] left-0 right-0 text-center font-serif text-xs text-stone-400">{n}</span>
    </div>
  );
}

function rustle() {
  try {
    const ctx = new AudioContext();
    const len = ctx.sampleRate * 0.35;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2) * 0.25;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = 1800;
    src.connect(f);
    f.connect(ctx.destination);
    src.onended = () => ctx.close();
    src.start();
  } catch {}
}

const field = "rounded-lg border border-slate-300 bg-white p-3 text-black outline-none focus:border-amber-500";

export default function Home() {
  const [name, setName] = useState("");
  const [age, setAge] = useState("5");
  const [langSel, setLangSel] = useState("English");
  const [langCustom, setLangCustom] = useState("");
  const [picked, setPicked] = useState<string[]>(["Dinosaurs"]);
  const [interestCustom, setInterestCustom] = useState("");
  const [lessonSel, setLessonSel] = useState("Kindness");
  const [lessonCustom, setLessonCustom] = useState("");
  const [pageCount, setPageCount] = useState(6);

  const [story, setStory] = useState<Story | null>(null);
  const [opened, setOpened] = useState(false);
  const [idx, setIdx] = useState(0);
  const [flip, setFlip] = useState<"next" | "prev" | null>(null);
  const [reading, setReading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [voiceMissing, setVoiceMissing] = useState(false);
  const [bookName, setBookName] = useState("");
  const [bookRtl, setBookRtl] = useState(false);

  const idxRef = useRef(0);
  const flipRef = useRef(false);
  const readingRef = useRef(false);
  const speechRef = useRef("en-IN");
  idxRef.current = idx;

  function stopReading() {
    readingRef.current = false;
    setReading(false);
    window.speechSynthesis?.cancel();
  }

  function toggleInterest(label: string) {
    setPicked((p) =>
      p.includes(label) ? p.filter((x) => x !== label) : p.length < 3 ? [...p, label] : p
    );
  }

  async function makeStory() {
    if (loading) return;
    const lang = LANGUAGES.find((l) => l.name === langSel);
    const language = langSel === "__other" ? langCustom.trim() : langSel;
    const interests = [...picked, interestCustom.trim()].filter(Boolean).join(", ");
    const lesson = lessonSel === "__custom" ? lessonCustom.trim() : lessonSel;

    if (!name.trim()) return setError("Please enter your child's name.");
    if (!language) return setError("Please type the language you want.");
    if (!lesson) return setError("Please write the lesson you want.");

    setError("");
    stopReading();
    setOpened(false);
    setLoading(true);

    try {
      const res = await fetch("/api/story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), age, interests, lesson, language, pages: pageCount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");

      speechRef.current = lang ? lang.speech : "";
      setBookRtl(!!lang?.rtl);
      setBookName(name.trim());
      setIdx(0);
      setStory(data);
      setTimeout(() => document.getElementById("book")?.scrollIntoView({ behavior: "smooth" }), 100);
      setTimeout(() => {
        rustle();
        setOpened(true);
      }, 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function turn(dir: "next" | "prev") {
    if (!story || flipRef.current) return;
    const i = idxRef.current;
    if (dir === "next" && i >= story.pages.length - 1) return;
    if (dir === "prev" && i <= 0) return;
    flipRef.current = true;
    rustle();
    setFlip(dir);
    setTimeout(() => {
      setIdx(dir === "next" ? i + 1 : i - 1);
      setFlip(null);
      flipRef.current = false;
    }, 850);
  }

  function manual(dir: "next" | "prev") {
    stopReading();
    turn(dir);
  }

  function speak(i: number) {
    if (!story || !readingRef.current) return;
    const u = new SpeechSynthesisUtterance(story.pages[i].text);
    const code = speechRef.current;
    if (code) {
      const voices = window.speechSynthesis.getVoices();
      const v =
        voices.find((x) => x.lang.replace("_", "-").toLowerCase() === code.toLowerCase()) ||
        voices.find((x) => x.lang.toLowerCase().startsWith(code.slice(0, 2).toLowerCase()));
      setVoiceMissing(!v);
      if (v) u.voice = v;
      u.lang = v ? v.lang : code;
    }
    u.rate = 0.9;
    u.onend = () => {
      if (!readingRef.current) return;
      if (i < story.pages.length - 1) {
        turn("next");
        setTimeout(() => speak(i + 1), 1100);
      } else stopReading();
    };
    window.speechSynthesis.speak(u);
  }

  function toggleRead() {
    if (reading) return stopReading();
    window.speechSynthesis.cancel();
    readingRef.current = true;
    setReading(true);
    speak(idxRef.current);
  }

  function closeBook() {
    stopReading();
    setOpened(false);
    setTimeout(() => setIdx(0), 900);
  }

  const n = story ? story.pages.length : 0;
  const leftIdx = flip === "prev" ? idx - 1 : idx;
  const rightIdx = flip === "next" ? idx + 1 : idx;
  const last = story ? idx === n - 1 : false;

  return (
    <div className="min-h-screen bg-stone-50 text-slate-800">
      <style>{`
        @keyframes turnNext { from { transform: rotateY(0deg); } to { transform: rotateY(-180deg); } }
        @keyframes turnPrev { from { transform: rotateY(0deg); } to { transform: rotateY(180deg); } }
        @keyframes floatArt { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .leafNext { animation: turnNext .85s ease-in-out forwards; }
        .leafPrev { animation: turnPrev .85s ease-in-out forwards; }
        .art { animation: floatArt 4s ease-in-out infinite; filter: drop-shadow(0 12px 12px rgba(0,0,0,.25)); }
        .spinner { width: 18px; height: 18px; border: 3px solid rgba(15,23,42,.3); border-top-color: #0f172a; border-radius: 50%; animation: spin .8s linear infinite; }
      `}</style>

      <header className="bg-slate-950">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="font-serif text-2xl tracking-wide text-amber-300">Storynest</div>
          <nav className="flex gap-8 text-sm text-slate-300">
            <a href="#create" className="hover:text-amber-300">Create</a>
            <a href="#features" className="hover:text-amber-300">Why Storynest</a>
          </nav>
        </div>
      </header>

      <section className="bg-slate-950 pb-20 pt-10">
        <div className="mx-auto grid max-w-6xl items-start gap-12 px-6 lg:grid-cols-2">
          <div className="lg:pt-10">
            <p className="mb-4 text-sm uppercase tracking-[0.3em] text-amber-400">Personalised storybooks</p>
            <h1 className="font-serif text-4xl leading-tight text-white sm:text-6xl">
              A bedtime story, written for <span className="text-amber-300">your child</span>, in any language.
            </h1>
            <p className="mt-6 max-w-lg text-lg text-slate-300">
              Choose a name, what they love and the lesson you want to share. Every story is brand new and opens as a real book, ready to read aloud.
            </p>
            <div className="mt-8 flex gap-8 text-sm text-slate-400">
              <div><div className="font-serif text-3xl text-white">24+</div>languages</div>
              <div><div className="font-serif text-3xl text-white">30+</div>lessons</div>
              <div><div className="font-serif text-3xl text-white">∞</div>new stories</div>
            </div>
          </div>

          <div id="create" className="rounded-2xl bg-white p-7 shadow-2xl">
            <h2 className="font-serif text-2xl text-slate-900">Create your story</h2>
            <div className="mt-5 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                  Child&apos;s name
                  <input className={field} placeholder="For example, Riya" value={name} onChange={(e) => setName(e.target.value)} />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                  Age
                  <select className={field} value={age} onChange={(e) => setAge(e.target.value)}>
                    {[3, 4, 5, 6, 7, 8, 9, 10].map((a) => (<option key={a} value={a}>{a} years</option>))}
                  </select>
                </label>
              </div>

              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Story language
                <select className={field} value={langSel} onChange={(e) => setLangSel(e.target.value)}>
                  {LANGUAGES.map((l) => (<option key={l.name} value={l.name}>{l.label}</option>))}
                  <option value="__other">Other (type your own)</option>
                </select>
              </label>
              {langSel === "__other" && (
                <input className={field} placeholder="Type any language, for example Nepali" value={langCustom} onChange={(e) => setLangCustom(e.target.value)} />
              )}

              <div className="text-sm font-medium text-slate-700">
                Favourite things <span className="font-normal text-slate-400">(pick up to 3)</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {INTERESTS.map((i) => (
                    <button key={i.label} onClick={() => toggleInterest(i.label)} className={`rounded-full border px-3 py-1.5 text-sm transition ${picked.includes(i.label) ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-slate-500"}`}>
                      {i.emoji} {i.label}
                    </button>
                  ))}
                </div>
                <input className={`${field} mt-3 w-full`} placeholder="Anything else they love? For example, their pet Bruno" value={interestCustom} onChange={(e) => setInterestCustom(e.target.value)} />
              </div>

              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Lesson of the story
                <select className={field} value={lessonSel} onChange={(e) => setLessonSel(e.target.value)}>
                  {LESSONS.map((l) => (<option key={l} value={l}>{l}</option>))}
                  <option value="__custom">✍️ Write my own lesson</option>
                </select>
              </label>
              {lessonSel === "__custom" && (
                <input className={field} placeholder="For example: my child is afraid of injections" value={lessonCustom} onChange={(e) => setLessonCustom(e.target.value)} />
              )}

              <div className="text-sm font-medium text-slate-700">
                Story length
                <div className="mt-2 flex gap-2">
                  {[5, 6, 8, 10].map((c) => (
                    <button key={c} onClick={() => setPageCount(c)} className={`flex-1 rounded-lg border py-2 text-sm transition ${pageCount === c ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-slate-500"}`}>
                      {c} pages
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

              <button onClick={makeStory} disabled={loading} className="flex items-center justify-center gap-3 rounded-lg bg-amber-500 py-3 font-semibold text-slate-950 transition hover:bg-amber-400 disabled:opacity-70">
                {loading ? (<><span className="spinner" /> Writing your story...</>) : "Write my story"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {story && (
        <section id="book" className="bg-gradient-to-b from-slate-900 to-slate-800 px-4 py-16">
          <h2 className="mb-10 text-center font-serif text-2xl text-amber-200 sm:text-3xl">{story.title}</h2>

          <div className="mx-auto w-full max-w-4xl" style={{ perspective: "2200px" }}>
            <div className="relative w-full" style={{ aspectRatio: "3 / 2", transformStyle: "preserve-3d", transition: "transform 1.1s ease", transform: opened ? "translateX(0)" : "translateX(-25%)" }}>
              <div className="absolute left-0 top-0 h-full w-1/2 overflow-hidden rounded-l-md shadow-2xl" style={{ opacity: opened ? 1 : 0, transition: "opacity .3s .6s" }}>
                <Art p={story.pages[leftIdx]} i={leftIdx} />
              </div>
              <div className="absolute right-0 top-0 h-full w-1/2 overflow-hidden rounded-r-md shadow-2xl">
                <Words p={story.pages[rightIdx]} n={rightIdx + 1} rtl={bookRtl} />
              </div>

              {flip === "next" && (
                <div className="leafNext absolute right-0 top-0 h-full w-1/2" style={{ transformOrigin: "left center", transformStyle: "preserve-3d", zIndex: 10 }}>
                  <div className="absolute inset-0 overflow-hidden rounded-r-md" style={face}><Words p={story.pages[idx]} n={idx + 1} rtl={bookRtl} /></div>
                  <div className="absolute inset-0 overflow-hidden rounded-l-md" style={{ ...face, transform: "rotateY(180deg)" }}><Art p={story.pages[idx + 1]} i={idx + 1} /></div>
                </div>
              )}
              {flip === "prev" && (
                <div className="leafPrev absolute left-0 top-0 h-full w-1/2" style={{ transformOrigin: "right center", transformStyle: "preserve-3d", zIndex: 10 }}>
                  <div className="absolute inset-0 overflow-hidden rounded-l-md" style={face}><Art p={story.pages[idx]} i={idx} /></div>
                  <div className="absolute inset-0 overflow-hidden rounded-r-md" style={{ ...face, transform: "rotateY(180deg)" }}><Words p={story.pages[idx - 1]} n={idx} rtl={bookRtl} /></div>
                </div>
              )}

              <div
                onClick={() => { if (!opened) { rustle(); setOpened(true); } }}
                className="absolute right-0 top-0 h-full w-1/2 cursor-pointer"
                style={{ transformOrigin: "left center", transformStyle: "preserve-3d", transform: opened ? "rotateY(-180deg)" : "rotateY(0deg)", transition: opened ? "transform 1.1s ease-in-out, visibility 0s 1.1s" : "transform 1.1s ease-in-out", visibility: opened ? "hidden" : "visible", zIndex: 20 }}
              >
                <div className="absolute inset-0 flex flex-col items-center justify-center rounded-r-lg border-y-4 border-r-4 border-amber-700/60 bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-950 p-6 text-center shadow-2xl" style={face}>
                  <div className="absolute inset-3 rounded border border-amber-400/50" />
                  <p className="font-serif text-[10px] uppercase tracking-[0.35em] text-amber-400 sm:text-xs">A story for</p>
                  <p className="my-2 font-serif text-xl text-amber-200 sm:text-4xl">{bookName}</p>
                  <div className="my-2 h-px w-16 bg-amber-400/60" />
                  <p className="px-4 font-serif text-xs text-amber-100/90 sm:text-lg">{story.title}</p>
                  <p className="mt-6 text-[10px] tracking-widest text-amber-300/70 sm:text-xs">TAP TO OPEN</p>
                </div>
                <div className="absolute inset-0 rounded-l-lg bg-slate-800" style={{ ...face, transform: "rotateY(180deg)" }} />
              </div>
            </div>
          </div>

          <div className="mx-auto mt-10 flex max-w-4xl flex-wrap items-center justify-center gap-3">
            <button onClick={() => manual("prev")} disabled={!opened || idx === 0 || !!flip} className="rounded-full border border-slate-500 px-6 py-2 text-slate-200 transition hover:border-amber-300 disabled:opacity-30">← Previous</button>
            <span className="px-3 font-serif text-sm text-slate-400">{opened ? `Page ${idx + 1} of ${n}` : "Closed"}</span>
            <button onClick={() => manual("next")} disabled={!opened || last || !!flip} className="rounded-full bg-amber-500 px-6 py-2 font-semibold text-slate-950 transition hover:bg-amber-400 disabled:opacity-30">Next →</button>
            <button onClick={toggleRead} disabled={!opened} className="rounded-full border border-amber-400 px-6 py-2 text-amber-300 transition hover:bg-amber-400/10 disabled:opacity-30">
              {reading ? "■ Stop reading" : "▶ Read to me"}
            </button>
          </div>

          {voiceMissing && (
            <p className="mx-auto mt-4 max-w-xl text-center text-sm text-amber-200/80">
              Your computer has no voice installed for this language, so the sound may be wrong or missing. You can add voices in Windows Settings, Time and language, Speech.
            </p>
          )}

          {opened && last && !flip && (
            <div className="mt-6 flex justify-center gap-3">
              <button onClick={closeBook} className="rounded-full bg-white/10 px-6 py-2 text-sm text-white hover:bg-white/20">Close the book</button>
              <a href="#create" className="rounded-full bg-white/10 px-6 py-2 text-sm text-white hover:bg-white/20">Write another story</a>
            </div>
          )}
        </section>
      )}

      <section id="features" className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="text-center font-serif text-3xl text-slate-900">Why parents choose Storynest</h2>
        <div className="mt-12 grid gap-10 sm:grid-cols-3">
          {[
            ["01", "Made for your child", "Their name, age and favourite things appear on every page."],
            ["02", "Any language, any lesson", "From bedtime habits to big feelings, in the language you speak at home."],
            ["03", "Ready to read aloud", "Let the book read and turn its own pages at bedtime."],
          ].map(([num, title, desc]) => (
            <div key={num} className="border-t-2 border-amber-500 pt-5">
              <div className="font-serif text-3xl text-amber-600">{num}</div>
              <h3 className="mt-2 font-serif text-xl text-slate-900">{title}</h3>
              <p className="mt-2 text-slate-600">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="bg-slate-950 py-8 text-center text-sm text-slate-500">© Storynest · Stories made with care</footer>
    </div>
  );
}