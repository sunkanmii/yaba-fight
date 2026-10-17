"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Hand,
  Shield,
  Wind,
  Zap,
  Target,
  Trophy,
  Pause,
  Play,
  Volume2,
  VolumeX,
  Settings,
  X,
  BookOpen,
  User,
  ChevronRight,
  Lock,
} from "lucide-react";
import {
  ArcadeEngine,
  validateSave,
  unlockedStage,
  ROUND_EXCHANGES,
} from "../lib/arcade/engine.mjs";
import { ArenaRenderer } from "../lib/arcade/render.mjs";
import { ACTIONS, FIGHTERS, MAPS, PRESETS, KEYS } from "../lib/arcade/data.mjs";
import { actionCost } from "../lib/arcade/combat.mjs";
import { FightAudio, type SoundCue } from "../lib/audio";
import {
  AccountPanel,
  loadAccount,
  type FighterAccount,
  type AccountRecord,
} from "./account";
import { SponsorPanel } from "./sponsor";
import { Legal } from "./legal";
import "./arcade-game.css";

type Snapshot = ReturnType<ArcadeEngine["snapshot"]>;
type Save = NonNullable<ReturnType<typeof validateSave>>;
type Placement = {
  slot: string;
  brand: string;
  image: string;
  url: string;
  start: string;
  end: string;
};
const icons = {
  jab: Hand,
  heavy: Zap,
  block: Shield,
  parry: Target,
  recover: Wind,
  "dodge-left": ArrowLeft,
  "dodge-right": ArrowRight,
};
const label = (a: string) =>
  a === "surge"
    ? "VOLTAGE"
    : ACTIONS.find((m) => m.id === a)?.name.toUpperCase() || "READY";
const storage = {
  get(key: string) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch {}
  },
};
const readSave = () => {
  try {
    return validateSave(JSON.parse(storage.get("yf-arcade-v2") || "null"));
  } catch {
    return null;
  }
};

export default function ArcadeGame() {
  const canvas = useRef<HTMLCanvasElement>(null),
    engine = useRef<ArcadeEngine | null>(null),
    audio = useRef<FightAudio | null>(null);
  const [view, setView] = useState<"menu" | "game">("menu"),
    [state, setState] = useState<Snapshot | null>(null),
    [name, setName] = useState(""),
    [level, setLevel] = useState(4),
    [preview, setPreview] = useState(0),
    [unlocked, setUnlocked] = useState(0),
    [save, setSave] = useState<Save | null>(null);
  const [modal, setModal] = useState(""),
    [paused, setPaused] = useState(false),
    [notice, setNotice] = useState(""),
    [muted, setMuted] = useState(false),
    [music, setMusic] = useState(true),
    [reduced, setReduced] = useState(false),
    [ready, setReady] = useState(false),
    [loaded, setLoaded] = useState(false);
  const [effects, setEffects] = useState(0.7),
    [musicVolume, setMusicVolume] = useState(0.35),
    [account, setAccount] = useState<FighterAccount | null>(null),
    [record, setRecord] = useState<AccountRecord>({ played: 0, wins: 0 }),
    [slot, setSlot] = useState("left-wall"),
    [placements, setPlacements] = useState<Placement[]>([]);
  const ui = useRef({ view, preview, reduced });
  ui.current = { view, preview, reduced };
  const modalRef = useRef(""),
    accountReturn = useRef(""),
    returnToPause = useRef(false),
    modalTrigger = useRef<HTMLElement | null>(null);
  const snapshot = useRef(0),
    messageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tell = (text: string) => {
    setNotice(text);
    if (messageTimer.current) clearTimeout(messageTimer.current);
    messageTimer.current = setTimeout(() => setNotice(""), 2800);
  };
  const refresh = () => {
    if (engine.current) setState(engine.current.snapshot());
  };
  const pause = useCallback((value: boolean) => {
    setPaused(value);
    if (engine.current) engine.current.paused = value;
    if (value) audio.current?.suspend();
    else audio.current?.resume();
  }, []);
  const open = useCallback(
    (kind: string) => {
      if (!modalRef.current) {
        returnToPause.current = !!engine.current?.paused;
        modalTrigger.current = document.activeElement as HTMLElement;
      }
      modalRef.current = kind;
      setModal(kind);
      if (engine.current) pause(true);
    },
    [pause],
  );
  const close = () => {
    accountReturn.current = "";
    modalRef.current = "";
    setModal("");
    if (engine.current) pause(returnToPause.current);
    requestAnimationFrame(() => modalTrigger.current?.focus());
  };
  const unlock = () => {
    audio.current?.unlock();
    audio.current?.setLevels(muted ? 0 : effects, musicVolume, music && !muted);
  };
  const action = useCallback((id: string) => {
    if (!engine.current) return;
    if (engine.current.act(id)) setState(engine.current.snapshot());
  }, []);
  useEffect(() => {
    const parsed = readSave();
    setSave(parsed);
    setUnlocked(
      unlockedStage(
        storage.get("yf-arcade-unlocked"),
        parsed,
        storage.get("yf-arcade-cleared") === "true",
      ),
    );
    if (parsed) setLevel(parsed.level);
    setName(storage.get("yf-name") || "");
    try {
      const p = JSON.parse(storage.get("yf-arcade-audio") || "{}");
      setMuted(p.muted === true);
      setMusic(p.music !== false);
      setEffects(
        typeof p.effects === "number"
          ? Math.max(0, Math.min(1, p.effects))
          : 0.7,
      );
      setMusicVolume(
        typeof p.musicVolume === "number"
          ? Math.max(0, Math.min(1, p.musicVolume))
          : 0.35,
      );
    } catch {}
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    setLoaded(true);
    const controller = new AbortController();
    fetch("/sponsors/placements.json", { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        if (!Array.isArray(data)) return;
        setPlacements(
          data
            .filter(
              (p: Placement) =>
                p &&
                ["left-wall", "right-wall"].includes(p.slot) &&
                typeof p.image === "string" &&
                /^\/sponsors\/[a-z0-9/_-]+\.(webp|png|jpg|svg)$/i.test(
                  p.image,
                ) &&
                typeof p.url === "string" &&
                p.url.startsWith("https://") &&
                Date.parse(p.start) <= Date.now() &&
                Date.parse(p.end) > Date.now(),
            )
            .slice(0, 2),
        );
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!loaded) return;
    storage.set(
      "yf-arcade-audio",
      JSON.stringify({ muted, music, effects, musicVolume }),
    );
    audio.current?.setLevels(muted ? 0 : effects, musicVolume, music && !muted);
  }, [loaded, muted, music, effects, musicVolume]);
  useEffect(() => {
    if (!canvas.current) return;
    let frame = 0,
      last = 0,
      disposed = false;
    const render = new ArenaRenderer(canvas.current);
    render.ready.then(() => {
      if (!disposed) setReady(true);
    });
    const sound = new FightAudio();
    audio.current = sound;
    const loop = (now: number) => {
      if (disposed) return;
      const dt = last ? Math.min(now - last, 100) : 0;
      last = now;
      const e = engine.current;
      if (e) {
        e.update(dt);
        const play = (cue: SoundCue) => {
          if (!e.paused) sound.play(cue);
        };
        for (const event of e.drain()) {
          if (event.type === "input" || event.type === "prepare")
            play(
              (event.type === "prepare" && event.action === "jab"
                ? "jab"
                : event.action === "heavy"
                  ? "charge"
                  : event.action === "dodge-left" ||
                      event.action === "dodge-right"
                    ? "feint"
                    : event.action === "recover"
                      ? "recover"
                      : "select") as SoundCue,
            );
          if (event.type === "round") play(("round" + e.round) as SoundCue);
          if (event.type === "fight") play("fight");
          if (event.type === "surge") play("charge");
          if (event.type === "notice") tell(event.text);
          if (event.type === "impact") {
            const r = event.result;
            const cue =
              r.tags[0] === "PARRY LANDED"
                ? "parry"
                : r.tags[0] === "CLEAN SLIP"
                  ? "feint"
                  : r.damage[0]
                    ? "hurt"
                    : r.moves[0] === "heavy" && r.damage[1]
                      ? "heavy"
                      : r.damage[1]
                        ? "jab"
                        : r.tags.includes("CLASH") ||
                            r.tags[0]?.includes("GUARD") ||
                            r.tags[0] === "BLOCKED"
                          ? "block"
                          : "miss";
            play(cue);
          }
          if (event.type === "roundWin") play("win");
          if (event.type === "roundLose") play("bell");
          if (event.type === "win" || event.type === "lose") {
            play(event.type === "win" ? "victory" : "lose");
            if (!e.practice) {
              const checkpoint = e.checkpoint();
              if (e.won && e.stage < 6) checkpoint.stage++;
              if (e.won)
                setUnlocked((previous) => {
                  const next = Math.max(previous, Math.min(6, e.stage + 1));
                  storage.set("yf-arcade-unlocked", String(next));
                  return next;
                });
              if (e.phase === "complete") {
                storage.set("yf-arcade-cleared", "true");
                storage.set("yf-arcade-v2", "null");
                setSave(null);
              } else {
                storage.set("yf-arcade-v2", JSON.stringify(checkpoint));
                setSave(checkpoint);
              }
            }
          }
        }
        if (e.serial !== snapshot.current) {
          snapshot.current = e.serial;
          setState(e.snapshot());
        }
        sound.setActive(e.phase === "tell");
      }
      render.draw(e, {
        menu: ui.current.view === "menu",
        stage: ui.current.preview,
        reduced: ui.current.reduced,
      });
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    const visibility = () => {
      if (document.hidden) {
        if (engine.current) pause(true);
        sound.suspend();
      }
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", visibility);
      sound.dispose();
      render.dispose();
      if (messageTimer.current) clearTimeout(messageTimer.current);
    };
  }, [pause]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (document.hidden) return;
      if (e.key === "Escape") {
        if (modal) close();
        else if (engine.current) pause(!engine.current.paused);
        return;
      }
      const target = e.target as HTMLElement;
      if (
        target?.matches("input,textarea,select") ||
        (e.key === " " && target?.closest("button,a"))
      )
        return;
      if (
        modal ||
        view !== "game" ||
        e.repeat ||
        engine.current?.paused ||
        document.hidden
      )
        return;
      const move =
        (KEYS as Record<string, string>)[e.key] ||
        (KEYS as Record<string, string>)[e.key.toLowerCase()];
      if (move) {
        e.preventDefault();
        unlock();
        action(move);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });
  useEffect(() => {
    if (!["localhost", "127.0.0.1"].includes(location.hostname)) return;
    const target = window as unknown as { __YABA_TEST__?: unknown };
    target.__YABA_TEST__ = {
      get engine() {
        return engine.current;
      },
      refresh,
      act: action,
      audioCue: (cue: SoundCue) => audio.current?.play(cue),
    };
    return () => {
      delete target.__YABA_TEST__;
    };
  }, [action]);
  function start(stage = 0, practice = false, resume = false) {
    if (stage > unlocked) {
      tell("Beat the previous rival in Arcade to unlock this fight.");
      return;
    }
    modalRef.current = "";
    unlock();
    storage.set("yf-name", name.trim().slice(0, 18) || "Fighter");
    engine.current = new ArcadeEngine({
      stage,
      level,
      history: resume && save ? save.history : [],
      practice,
    });
    snapshot.current = -1;
    setState(engine.current.snapshot());
    setView("game");
    setModal("");
    pause(false);
    if (!practice) {
      const checkpoint = engine.current.checkpoint();
      storage.set("yf-arcade-v2", JSON.stringify(checkpoint));
      setSave(checkpoint);
    }
  }
  function leave() {
    modalRef.current = "";
    engine.current = null;
    setState(null);
    setView("menu");
    setPaused(false);
    setModal("");
    audio.current?.setActive(false);
    audio.current?.play("select");
  }
  async function accountModal() {
    open("account");
    try {
      const r = await loadAccount();
      setAccount(r.user);
      setRecord(r.record || { played: 0, wins: 0 });
      if (r.user && accountReturn.current === "sponsor") {
        modalRef.current = "sponsor";
        setModal("sponsor");
        accountReturn.current = "";
      }
    } catch {
      tell("Accounts are unavailable. Arcade still works.");
    }
  }
  const fighter = FIGHTERS[state?.stage ?? preview],
    map = MAPS[fighter.map as keyof typeof MAPS],
    isPlaying = view === "game" && state,
    over = !!state && ["fightOver", "complete"].includes(state.phase),
    player = state?.players[0],
    enemy = state?.players[1];
  const boards = (
    <div className="arena-boards">
      {["left-wall", "right-wall"].map((id, i) => {
        const p = placements.find((p) => p.slot === id);
        return (
          <button
            key={id}
            className={`arena-board board-${i}`}
            disabled={!!isPlaying && !paused && !over}
            onClick={() => {
              setSlot(id);
              open(p ? "advertiser" : "sponsor");
            }}
            aria-label={
              p ? `Sponsor: ${p.brand}` : "Enquire about this sponsor space"
            }
          >
            {p ? (
              <>
                <img src={p.image} alt={p.brand} />
                <small>SPONSOR</small>
              </>
            ) : (
              <>
                <span>YOUR BRAND</span>
                <small>IN THIS CORNER</small>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
  return (
    <main
      id="arcade-main"
      tabIndex={-1}
      className={`yf-cabinet ${isPlaying ? "is-fighting" : "is-menu"} ${save ? "has-save" : ""} ${reduced ? "reduce-motion" : ""}`}
    >
      <a className="skip-link" href="#arcade-main">
        Skip to game
      </a>
      {view === "game" && <h1 className="sr-only">Yaba Fight arcade</h1>}
      {view === "menu" ? (
        <header className="cabinet-top">
          <a className="mini-wordmark" href="/">
            YF<span>YABA FIGHT</span>
          </a>
          <div className="top-tools">
            <button aria-label="Account" onClick={accountModal}>
              <User size={18} />
            </button>
            <button
              aria-label={muted ? "Unmute audio" : "Mute audio"}
              onClick={() => {
                unlock();
                setMuted((v) => !v);
              }}
            >
              {muted ? <VolumeX size={19} /> : <Volume2 size={19} />}
            </button>
            <button aria-label="Settings" onClick={() => open("settings")}>
              <Settings size={19} />
            </button>
          </div>
        </header>
      ) : (
        <header className="fight-hud">
          <div className="fighter-meter">
            <div className="meter-name">
              <strong>{name.trim() || "Fighter"}</strong>
              <span>
                {Math.ceil(player!.hp)}
                <small> HP</small>
              </span>
            </div>
            <div
              className="health-track"
              role="progressbar"
              aria-label="Your health"
              aria-valuenow={player!.hp}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <i style={{ width: player!.hp + "%" }} />
            </div>
            <div
              className="stamina-track"
              role="progressbar"
              aria-label="Your stamina"
              aria-valuenow={player!.stamina}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <i style={{ width: player!.stamina + "%" }} />
            </div>
            <div className="meter-detail">
              <span>STAMINA {Math.ceil(player!.stamina)}</span>
              <b>
                {player!.counter
                  ? "COUNTER +8"
                  : player!.exposed
                    ? "OPEN TO A HIT"
                    : player!.guards > 1
                      ? "GUARD STRAIN"
                      : ""}
              </b>
            </div>
          </div>
          <div className="round-meter">
            <span>ROUND {state!.round}/3</span>
            <strong>
              {state!.score[0]}
              <i>:</i>
              {state!.score[1]}
            </strong>
            <small>
              {engine.current?.practice
                ? "PRACTICE"
                : `FIGHT ${state!.stage + 1}/7`}
            </small>
          </div>
          <div className="fighter-meter rival-meter">
            <div className="meter-name">
              <strong>{fighter.name}</strong>
              <span>
                {Math.ceil(enemy!.hp)}
                <small> HP</small>
              </span>
            </div>
            <div
              className="health-track"
              role="progressbar"
              aria-label="Rival health"
              aria-valuenow={enemy!.hp}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <i style={{ width: enemy!.hp + "%" }} />
            </div>
            <div
              className="stamina-track"
              role="progressbar"
              aria-label="Rival stamina"
              aria-valuenow={enemy!.stamina}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <i style={{ width: enemy!.stamina + "%" }} />
            </div>
            <div className="meter-detail">
              <span>STAMINA {Math.ceil(enemy!.stamina)}</span>
              <button aria-label="Pause game" onClick={() => pause(true)}>
                <Pause size={16} />
              </button>
            </div>
          </div>
        </header>
      )}
      <section className="fight-stage" aria-label={`${map.name} arena`}>
        <canvas
          ref={canvas}
          className="arena-canvas"
          aria-label="Animated first-person fight. Watch the hands and choose a move when ready."
          role="img"
        />
        {boards}
        {view === "menu" ? (
          <>
            <div className="menu-copy">
              <p className="cabinet-kicker">SEVEN RIVALS. ONE MAINLAND.</p>
              <h1>
                YABA
                <br />
                <span>FIGHT.</span>
              </h1>
              <p className="menu-tagline">
                Small game.
                <br />
                Big wahala.
              </p>
              <div className="start-options">
                <label className="nickname-label" htmlFor="fighter-name">
                  YOUR CORNER NAME
                  <input
                    id="fighter-name"
                    maxLength={18}
                    autoComplete="nickname"
                    placeholder="Fighter"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <div className="difficulty-picks" aria-label="Difficulty">
                  {Object.entries(PRESETS).map(([title, value]) => (
                    <button
                      key={title}
                      aria-pressed={level === value}
                      onClick={() => setLevel(value)}
                    >
                      {title}
                    </button>
                  ))}
                </div>
                {save && (
                  <button
                    className="arcade-start"
                    disabled={!ready}
                    onClick={() => start(save.stage, false, true)}
                  >
                    <Play size={21} fill="currentColor" />
                    CONTINUE <small>FIGHT {save.stage + 1}/7</small>
                  </button>
                )}
                <button
                  className={save ? "arcade-substart" : "arcade-start"}
                  disabled={!ready}
                  onClick={() => start()}
                >
                  <Hand size={21} />
                  {!ready
                    ? "LOADING THE YARD…"
                    : save
                      ? "NEW ARCADE RUN"
                      : "ENTER THE ARCADE"}
                  <ChevronRight size={21} />
                </button>
                <div className="menu-secondary">
                  <button onClick={() => open("practice")}>PRACTICE</button>
                  <button onClick={() => open("how")}>
                    HOW TO FIGHT <BookOpen size={14} />
                  </button>
                </div>
              </div>
            </div>
            <div className="featured-rival">
              <span>{fighter.title}</span>
              <strong>{fighter.name}</strong>
              <small>{map.name}</small>
            </div>
            <div className="roster-strip" aria-label="Meet the seven rivals">
              {FIGHTERS.map((f, i) => (
                <button
                  key={f.id}
                  aria-label={
                    i > unlocked
                      ? `Locked: ${f.name}. Beat ${FIGHTERS[i - 1].name} to unlock.`
                      : `Preview ${f.name}, ${f.title}`
                  }
                  disabled={i > unlocked}
                  aria-pressed={preview === i}
                  onClick={() => setPreview(i)}
                >
                  <img src={`/arcade/heads/${f.id}.webp`} alt="" />
                  <span>{i + 1}</span>
                  {i > unlocked && (
                    <Lock size={20} className="rival-lock" aria-hidden="true" />
                  )}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="arena-location">
              <span>{map.name}</span>
              <small>
                LV {Math.min(10, Math.round(state!.level + state!.stage * 0.4))}{" "}
                · {fighter.title}
              </small>
            </div>
            {state!.phase === "tell" && (
              <div className="decision-status">
                <span>YOUR MOVE</span>
                <small>Take your time.</small>
                <span className="sr-only">
                  {label(state!.intent)} from your {state!.lane}. Read the
                  opponent's pose before choosing.
                </span>
                {state!.intent === "surge" && (
                  <b>VOLTAGE · GUARD WON'T STOP THIS</b>
                )}
              </div>
            )}
            {(state!.phase === "intro" || state!.phase === "ready") && (
              <div className="arena-announcement">
                <small>
                  {fighter.name} · {fighter.title}
                </small>
                <strong>
                  {state!.phase === "ready"
                    ? "FIGHT!"
                    : `ROUND ${state!.round}`}
                </strong>
                <span>“{fighter.line}”</span>
              </div>
            )}
            {state!.phase === "roundOver" && (
              <div className="arena-announcement">
                <small>ROUND {state!.round}</small>
                <strong>
                  {engine.current?.roundWinner === 0
                    ? "YOUR ROUND"
                    : engine.current?.roundWinner === 1
                      ? "THEIR ROUND"
                      : "EVEN ROUND"}
                </strong>
                <span>
                  {state!.score[0]} : {state!.score[1]}
                </span>
              </div>
            )}
            {state!.phase === "impact" && state!.result && (
              <div
                className={`exchange-result ${state!.result.damage[1] && !state!.result.damage[0] ? "result-good" : ""}`}
                role="status"
              >
                <strong>
                  {state!.result.tags[0] || label(state!.result.moves[0])}
                </strong>
                <span>
                  {state!.result.notes[0] ||
                    (state!.result.damage[1]
                      ? `${fighter.name} took ${state!.result.damage[1]} damage.`
                      : state!.result.damage[0]
                        ? `You took ${state!.result.damage[0]} damage.`
                        : "Reset. Read the next move.")}
                </span>
              </div>
            )}
            {!paused && state!.pending && state!.phase === "commit" && (
              <div className="committed-move">
                {label(state!.pending)} COMMITTED
                {state!.pending === "parry" ? " · 50% CHANCE" : ""}
              </div>
            )}
          </>
        )}
      </section>
      {isPlaying ? (
        <footer className="combat-deck">
          <div className="deck-readout">
            <span>
              {(state!.beat ?? 0) > ROUND_EXCHANGES
                ? "OVERTIME · BOTH LOSE HEALTH"
                : state!.phase === "tell"
                  ? "WATCH HIS HANDS · CHOOSE WHEN READY"
                  : state!.phase === "commit"
                    ? "WATCH THE EXCHANGE"
                    : "RESET YOUR STANCE"}
            </span>
            <button onClick={() => open("how")}>
              MOVE GUIDE <BookOpen size={13} />
            </button>
          </div>
          <div className="action-row">
            {ACTIONS.slice(0, 5).map((a) => {
              const Icon = icons[a.id as keyof typeof icons],
                cost = actionCost(a.id, state!.intent, player);
              return (
                <button
                  key={a.id}
                  data-action={a.id}
                  aria-label={`${a.name}. ${a.hint}`}
                  aria-pressed={state!.pending === a.id}
                  disabled={
                    state!.phase !== "tell" ||
                    !!state!.pending ||
                    (state!.bossCharge &&
                      state!.prepared &&
                      ["jab", "recover"].includes(a.id)) ||
                    paused ||
                    player!.stamina < cost
                  }
                  onClick={() => {
                    unlock();
                    action(a.id);
                  }}
                >
                  <Icon size={22} />
                  <strong>{a.name}</strong>
                  <small>
                    {a.id === "parry" ? "50% · " : ""}
                    {a.id === "recover" ? "+38" : `−${cost}`} STM
                  </small>
                  <kbd>{a.key === "Space" ? "SPACE" : a.key}</kbd>
                </button>
              );
            })}
          </div>
          <div className="slip-row">
            {ACTIONS.slice(5).map((a) => {
              const Icon = icons[a.id as keyof typeof icons];
              return (
                <button
                  key={a.id}
                  data-action={a.id}
                  disabled={
                    state!.phase !== "tell" ||
                    !!state!.pending ||
                    paused ||
                    player!.stamina < 14
                  }
                  onClick={() => {
                    unlock();
                    action(a.id);
                  }}
                >
                  <Icon size={19} />
                  <strong>{a.name}</strong>
                  <small>−14</small>
                  <kbd>{a.key}</kbd>
                </button>
              );
            })}
            <span>
              Fist on left? Slip right.
              <br />
              Fist on right? Slip left.
            </span>
          </div>
        </footer>
      ) : (
        <footer className="cabinet-bottom">
          <span>LOCAL ARCADE · NO SIGN-UP NEEDED</span>
          <nav>
            <button onClick={() => open("sponsor")}>SPONSOR A WALL</button>
            <button onClick={() => open("privacy")}>PRIVACY</button>
            <button onClick={() => open("terms")}>TERMS</button>
            <button onClick={() => open("cookies")}>COOKIES</button>
          </nav>
        </footer>
      )}
      {notice && (
        <div className="game-toast" role="status">
          {notice}
        </div>
      )}
      {isPlaying && paused && !modal && !over && (
        <div className="game-overlay">
          <div className="pause-panel">
            <small>TAKE YOUR TIME</small>
            <h2>
              IN YOUR
              <br />
              CORNER.
            </h2>
            <p>The fight is paused.</p>
            <button className="arcade-start" onClick={() => pause(false)}>
              <Play size={20} />
              BACK TO IT
            </button>
            <button
              className="arcade-substart"
              onClick={() => open("settings")}
            >
              <Settings size={18} />
              SETTINGS
            </button>
            <button className="arcade-substart" onClick={leave}>
              RETURN TO MENU
            </button>
          </div>
        </div>
      )}
      {isPlaying && over && !modal && (
        <div className="game-overlay victory-overlay">
          <div className="victory-panel">
            <Trophy size={40} />
            <small>
              {state!.phase === "complete"
                ? "SEVEN DOWN. MAINLAND CROWNED."
                : state!.won
                  ? "CORNER TO CORNER. YOU DID THAT."
                  : "NO SHAME. STUDY THE OPENING."}
            </small>
            <h2>
              {state!.phase === "complete"
                ? "MAINLAND\nCHAMPION."
                : state!.won
                  ? "NA YOU\nWIN!"
                  : "WE LEARN.\nWE GO AGAIN."}
            </h2>
            <p>
              {state!.score[0]} : {state!.score[1]} against {fighter.name} ·{" "}
              {fighter.title}
            </p>
            <p className="fight-tip">
              {state!.won && state!.stage < 6 && !engine.current?.practice
                ? `Next: ${FIGHTERS[state!.stage + 1].name}. ${FIGHTERS[state!.stage + 1].style}`
                : fighter.tip}
            </p>
            <button
              className="arcade-start"
              onClick={() => {
                unlock();
                if (state!.won && state!.stage < 6 && !engine.current?.practice)
                  engine.current?.next();
                else engine.current?.retry();
                refresh();
                pause(false);
              }}
            >
              {state!.won && state!.stage < 6 && !engine.current?.practice
                ? "NEXT FIGHT"
                : "FIGHT AGAIN"}
              <ArrowRight size={20} />
            </button>
            <button className="arcade-substart" onClick={leave}>
              BACK TO THE YARD
            </button>
          </div>
        </div>
      )}
      {modal && (
        <div
          className="game-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <section
            className={`arcade-modal ${modal === "practice" ? "roster-modal" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-label={modal === "how" ? "How to fight" : modal}
            ref={(node) => {
              if (node && !node.contains(document.activeElement))
                node.querySelector<HTMLButtonElement>("button")?.focus();
            }}
            onKeyDown={(e) => {
              if (e.key !== "Tab") return;
              const nodes = e.currentTarget.querySelectorAll<HTMLElement>(
                  "button:not(:disabled),input,select,textarea,a[href]",
                ),
                first = nodes[0],
                last = nodes[nodes.length - 1];
              if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last?.focus();
              } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first?.focus();
              }
            }}
          >
            <button
              className="close-modal"
              aria-label="Close dialog"
              onClick={close}
            >
              <X size={22} />
            </button>
            <span className="cabinet-kicker">YOUR CORNER</span>
            <h2>
              {modal === "how"
                ? "READ. REACT. REPEAT."
                : modal === "settings"
                  ? "MAKE IT YOURS."
                  : modal === "practice"
                    ? "PICK YOUR RIVAL."
                    : modal === "account"
                      ? "YOUR ACCOUNT."
                      : modal === "sponsor"
                        ? "TAKE A WALL."
                        : modal === "advertiser"
                          ? "FROM OUR SPONSOR."
                          : modal.toUpperCase() + "."}
            </h2>
            {modal === "how" && (
              <>
                <p>
                  Three rounds per fight. Win two to move on. Seven rivals stand
                  between you and the Mainland crown.
                </p>
                <p className="rule-highlight">
                  There is no decision timer. Watch the opponent's hands, then
                  choose a move. Your choice starts the exchange.
                </p>
                <div className="slip-lesson">
                  <div>
                    <img
                      src="/arcade/fighters/kunle/8.webp"
                      alt="Kunle draws back the fist on your left."
                    />
                    <p>Fist on your left?</p>
                    <strong>
                      Slip right <ArrowRight size={16} aria-hidden="true" />
                    </strong>
                  </div>
                  <div>
                    <img
                      className="from-right"
                      src="/arcade/fighters/kunle/8.webp"
                      alt="Kunle draws back the fist on your right."
                    />
                    <p>Fist on your right?</p>
                    <strong>
                      <ArrowLeft size={16} aria-hidden="true" /> Slip left
                    </strong>
                  </div>
                </div>
                <p>
                  A slip moves your head away from the punching hand. A clean
                  slip avoids the hit and gives your next punch +8 damage. You
                  do not have to time the button press.
                </p>
                <div className="move-guide">
                  {ACTIONS.map((a) => (
                    <div key={a.id}>
                      <strong>
                        {a.name}
                        <kbd>{a.key}</kbd>
                      </strong>
                      <p>{a.hint}</p>
                    </div>
                  ))}
                </div>
                <p>
                  <strong>Matching moves clash.</strong> Matching punches do no
                  health damage. Guard drains stamina, especially when repeated.
                  A failed parry leaves you exposed to +8 damage next exchange.
                  Breathe restores stamina but taking a hit while breathing
                  hurts more.
                </p>
                <p>
                  Jab interrupts power. Power chips a guard. After 30 exchanges,
                  a health lead decides the round; tied fighters enter
                  escalating overtime. The rooftop boss has a 3.6-second,
                  unblockable voltage charge. Take one optional breath or jab,
                  then choose a slip away from his punching hand. Take your
                  time.
                </p>
                <button className="arcade-start" onClick={close}>
                  I GET IT <ArrowRight size={20} />
                </button>
              </>
            )}
            {modal === "settings" && (
              <div className="settings-form">
                <label>
                  Effects volume <span>{Math.round(effects * 100)}%</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step=".05"
                    value={effects}
                    onChange={(e) => {
                      unlock();
                      setEffects(Number(e.target.value));
                    }}
                  />
                </label>
                <label>
                  Music volume <span>{Math.round(musicVolume * 100)}%</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step=".05"
                    value={musicVolume}
                    onChange={(e) => {
                      unlock();
                      setMusicVolume(Number(e.target.value));
                    }}
                  />
                </label>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={music}
                    onChange={(e) => {
                      unlock();
                      setMusic(e.target.checked);
                    }}
                  />
                  Play the original percussion soundtrack
                </label>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={muted}
                    onChange={(e) => setMuted(e.target.checked)}
                  />
                  Mute all audio
                </label>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={reduced}
                    onChange={(e) => setReduced(e.target.checked)}
                  />
                  Reduce shake and decorative motion
                </label>
                <label>
                  Next fight difficulty <span>LEVEL {level}/10</span>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={level}
                    onChange={(e) => setLevel(Number(e.target.value))}
                  />
                </label>
                <p>
                  Higher levels give sharper pattern reading and more defensive
                  moves. You have unlimited time to choose at every difficulty.
                  Your rival chooses before your current input. Difficulty
                  applies when starting or continuing a fight.
                </p>
              </div>
            )}
            {modal === "practice" && (
              <>
                <p>
                  One rival. No campaign progress at stake. Every rival learns
                  from your previous moves.
                </p>
                <div className="practice-grid">
                  {FIGHTERS.map((f, i) => (
                    <button
                      key={f.id}
                      disabled={i > unlocked}
                      onClick={() => start(i, true)}
                    >
                      <img src={`/arcade/heads/${f.id}.webp`} alt="" />
                      <span>
                        <strong>{f.name}</strong>
                        <small>{f.title}</small>
                        <em>
                          {i > unlocked
                            ? `Beat ${FIGHTERS[i - 1].name} in Arcade to unlock.`
                            : f.style}
                        </em>
                      </span>
                      {i > unlocked ? (
                        <Lock size={19} />
                      ) : (
                        <ArrowRight size={19} />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
            {modal === "account" && (
              <>
                <p>
                  Accounts are optional. Arcade progress stays on this device;
                  account progress sync and online play are paused.
                </p>
                <AccountPanel
                  user={account}
                  record={record}
                  initialName={name}
                  onChange={(user, next) => {
                    setAccount(user);
                    if (next) setRecord(next);
                    if (user) {
                      setName(user.name);
                      if (accountReturn.current) {
                        modalRef.current = accountReturn.current;
                        setModal(accountReturn.current);
                        accountReturn.current = "";
                      }
                    }
                  }}
                />
              </>
            )}
            {modal === "sponsor" && (
              <>
                <div className="wall-picks">
                  {["left-wall", "right-wall"].map((s) => (
                    <button
                      key={s}
                      aria-pressed={slot === s}
                      onClick={() => setSlot(s)}
                    >
                      {s === "left-wall" ? "LEFT WALL" : "RIGHT WALL"}
                    </button>
                  ))}
                </div>
                <SponsorPanel
                  slot={slot}
                  user={account}
                  onSignIn={() => {
                    accountReturn.current = "sponsor";
                    void accountModal();
                  }}
                />
              </>
            )}
            {modal === "advertiser" && (
              <>
                {placements
                  .filter((p) => p.slot === slot)
                  .map((p) => (
                    <div key={p.slot}>
                      <img
                        className="sponsor-art"
                        src={p.image}
                        alt={p.brand}
                      />
                      <p>
                        This is a direct sponsor placement. No third-party
                        tracking code is loaded.
                      </p>
                      <a
                        className="arcade-start"
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer sponsored"
                      >
                        VISIT {p.brand}
                        <ArrowRight size={18} />
                      </a>
                    </div>
                  ))}
              </>
            )}
            {["privacy", "terms", "cookies"].includes(modal) && (
              <Legal kind={modal} />
            )}
          </section>
        </div>
      )}
    </main>
  );
}
