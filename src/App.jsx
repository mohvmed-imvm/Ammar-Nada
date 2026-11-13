
import { useEffect } from "react";
import "./style.css";

export default function App() {
  useEffect(() => {
    let cancelled = false;

    async function startScene() {
      try {
        await import("./scene.js");
      } catch (error) {
        console.error("Failed to start the 3D scene:", error);

        if (!cancelled) {
          const errorElement = document.getElementById("error");

          if (errorElement) {
            errorElement.textContent =
              "حصلت مشكلة أثناء تشغيل المشهد. افتح Console لمعرفة التفاصيل.";
            errorElement.style.display = "block";
          }
        }
      }
    }

    startScene();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="stage">
      <canvas id="scene" />

      <div className="vignette" />

      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">4U</span>
          <span className="brand-name">CELEBRATIONS</span>
        </div>
      </header>

      <section id="intro" className="intro">
        <p className="eyebrow">4U CELEBRATIONS PRESENTS</p>
        <h1>THE NEXT CHAPTER</h1>
        <p>ONE PLAYER. ONE MOMENT. ONE NEW SEASON.</p>
      </section>

      <section id="prompt" className="prompt">
        <h2 id="promptTitle">جاري تجهيز الملعب...</h2>
        <p id="promptSub">استعد للحظة الحسم</p>
      </section>

      <div id="loader" className="loader">
        <div className="loader-ring" />
        <p id="loadtext">جاري تحميل الملعب والشخصيات...</p>
      </div>

      <div id="error" className="error" role="alert" />

      <section id="message" className="message">
        <p className="eyebrow">A NEW SEASON BEGINS</p>
        <h2 id="finalTitle">كل سنة وأنت بطل</h2>
        <p id="finalMessage">
          النهارده بداية موسم جديد في حياتك، مليان أهداف تحققها وانتصارات
          تستاهلها. افتكر دايمًا إن أحلى لحظاتك لسه جاية.
        </p>
        <button id="restartBtn" type="button">
          REPLAY EXPERIENCE
        </button>
      </section>
    </main>
  );
}
