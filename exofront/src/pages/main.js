import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";

export default function PredictorPage() {
  const router = useRouter();

  const [mode, setMode] = useState("professional"); 
  const [inputs, setInputs] = useState({
    period: "",
    duration: "",
    depth: "",
    prad: "",
    steff: "",
    srad: "",
    mag: "",
  });
  const [result, setResult] = useState(null); 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showInstructions, setShowInstructions] = useState(false);

  const [bulkMode, setBulkMode] = useState("professional");
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkError, setBulkError] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);

  const canvasRef = useRef(null);
  const threeStateRef = useRef({ renderer: null, scene: null, camera: null, currentModel: null, raf: null });

  useEffect(() => {
    if (typeof window === "undefined") return;

    let THREE, GLTFLoader;
    let mounted = true;

    (async () => {
      const three = await import("three");
      const { GLTFLoader: _GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
      THREE = three;
      GLTFLoader = _GLTFLoader;

      const canvas = canvasRef.current;
      if (!canvas || !mounted) return;

      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      renderer.setPixelRatio(window.devicePixelRatio || 1);
      renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
      camera.position.set(0, 0, 3);

      const ambient = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambient);
      const dir = new THREE.DirectionalLight(0xffffff, 0.8);
      dir.position.set(5, 5, 5);
      scene.add(dir);

      scene.background = null;
      const loader = new GLTFLoader();

      const addModel = async (relativePath) => {
        if (threeStateRef.current.currentModel) {
          scene.remove(threeStateRef.current.currentModel);
          threeStateRef.current.currentModel.traverse((c) => {
            if (c.geometry) c.geometry.dispose();
            if (c.material) {
              if (Array.isArray(c.material)) c.material.forEach((m) => m.dispose());
              else c.material.dispose();
            }
          });
          threeStateRef.current.currentModel = null;
        }

        try {
          const gltf = await loader.loadAsync(relativePath);
          const root = gltf.scene || gltf.scenes[0];
          root.scale.setScalar(1);
          root.rotation.y = 0;
          root.position.set(0, -0.2, 0);
          scene.add(root);
          threeStateRef.current.currentModel = root;
        } catch (e) {
          console.error("GLTF load error", e);
        }
      };

      threeStateRef.current = { renderer, scene, camera, loader, addModel, currentModel: null, raf: null };

      const animate = (t) => {
        if (!mounted) return;
        if (threeStateRef.current.currentModel) {
          threeStateRef.current.currentModel.rotation.y += 0.005;
        }
        renderer.render(scene, camera);
        threeStateRef.current.raf = requestAnimationFrame(animate);
      };
      threeStateRef.current.raf = requestAnimationFrame(animate);

      const onResize = () => {
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height, false);
      };
      window.addEventListener("resize", onResize);

      return () => {
        mounted = false;
        window.removeEventListener("resize", onResize);
        if (threeStateRef.current.raf) cancelAnimationFrame(threeStateRef.current.raf);
        renderer.dispose();
      };
    })();

    return () => {
      if (threeStateRef.current.raf) cancelAnimationFrame(threeStateRef.current.raf);
    };
  }, []);

  const handleInputChange = (k, v) => setInputs((s) => ({ ...s, [k]: v }));

  const tooltips = {
    period: "Orbital period (days). Time the planet takes to orbit its star.",
    duration: "Transit duration (hours). How long the transit lasts.",
    depth: "Transit depth (fraction or ppm). How deep the transit signal is.",
    prad: "Planet radius (in Earth radii).",
    steff: "Stellar effective temperature (K).",
    srad: "Stellar radius (in Solar radii).",
    mag: "Stellar magnitude (brightness).",
  };

  const professionalFields = ["period", "duration", "depth", "prad", "steff", "srad", "mag"];
  const amateurFields = ["period", "duration", "depth", "mag"];

  const handleSubmit = async (e) => {
    e && e.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);

    try {
      const payload =
        mode === "professional"
          ? {
              period: inputs.period,
              duration: inputs.duration,
              depth: inputs.depth,
              prad: inputs.prad,
              steff: inputs.steff,
              srad: inputs.srad,
              mag: inputs.mag,
            }
          : {
              period: inputs.period,
              duration: inputs.duration,
              depth: inputs.depth,
              mag: inputs.mag,
            };

      const endpoint = mode === "professional" ? "http://127.0.0.1:8000/api/users/predict/" : "http://127.0.0.1:8000/api/users/predict_noob/";
      const res = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text();
        setError(`Server error: ${res.status} ${txt}`);
        setLoading(false);
        return;
      }

      const data = await res.json();
      setResult(data);
      const threeState = threeStateRef.current;
      if (threeState && threeState.addModel) {
        const modelPath = data.prediction === 1
          ? "/planets/exoplanet.glb"
          : "/planets/not_exoplanet.glb";
        threeState.addModel(modelPath);
      }
    } catch (err) {
      setError("Network or parsing error: " + String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUpload = async (e) => {
    e && e.preventDefault();
    setBulkError("");
    setBulkLoading(true);
    if (!bulkFile) {
      setBulkError("Please select a CSV file.");
      setBulkLoading(false);
      return;
    }

    const endpoint = bulkMode === "professional" ? "http://127.0.0.1:8000/api/users/bulk_predict/" : "http://127.0.0.1:8000/api/users/bulk_predict_noob/";
    try {
      const form = new FormData();
      form.append("file", bulkFile);
      const res = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        body: form,
      });
      if (!res.ok) {
        const t = await res.text();
        setBulkError(`Bulk upload error: ${res.status} ${t}`);
        setBulkLoading(false);
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bulk_result_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setBulkError("Network error: " + String(err));
    } finally {
      setBulkLoading(false);
    }
  };

  const formatProbability = (pred, prob) => {
    const percent = (prob * 100);
    if (pred === 1) return `${percent.toFixed(2)}%`;
    return `${(100 - percent).toFixed(2)}%`;
  };

  function ShapBar({ name, value }) {
    const abs = Math.abs(value);
    const scale = Math.min(abs / 4, 1); 
    const leftWidth = value < 0 ? `${scale * 100}%` : "0%";
    const rightWidth = value > 0 ? `${scale * 100}%` : "0%";
    return (
      <div className="flex flex-col text-xs mb-2">
        <div className="flex justify-between items-center">
          <div className="font-medium">{name}</div>
          <div className="text-gray-300">{value.toFixed(3)}</div>
        </div>
        <div className="flex items-center h-3 mt-1 bg-black/30 rounded overflow-hidden">
          <div style={{ width: leftWidth }} className="h-full bg-red-600 transition-all" />
          <div className="flex-1 h-full relative">
            <div style={{ left: "50%" }} className="absolute top-0 bottom-0 w-px bg-gray-600" />
            <div style={{ width: rightWidth, right: 0 }} className="absolute top-0 bottom-0 right-0 bg-green-500" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-black text-white">
      <header className="w-full flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gradient-to-b from-black/70 to-black/30">
        <div className="flex items-center space-x-6">
          <div className="text-2xl font-bold cursor-pointer" onClick={() => router.push("/main")}>Main</div>
          <div className="text-sm cursor-pointer" onClick={() => router.push("/all-predictions")}>All Predictions</div>
          <div className="text-sm cursor-pointer" onClick={() => router.push("/my-predictions")}>My Predictions</div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-300">Mode: <span className="font-medium">{mode}</span></div>
          <button
            onClick={() => setShowInstructions(true)}
            className="px-3 py-2 bg-purple-800/80 hover:bg-purple-700 rounded-md text-sm"
          >
            Instructions
          </button>
        </div>
      </header>

      <div className="flex gap-6 p-6">
        <aside className="w-80 backdrop-blur-md bg-black/50 border border-gray-800 rounded-2xl p-4">
          <h3 className="text-lg font-semibold mb-3">Result</h3>
          {loading && <div className="text-sm text-gray-300">Waiting for model...</div>}
          {error && <div className="text-sm text-red-400">{error}</div>}
          {!result && !error && !loading && <div className="text-sm text-gray-400">No prediction yet.</div>}

          {result && (
            <div className="mt-2 text-sm space-y-3">
              <div>
                <div className="text-xs text-gray-300">Prediction:</div>
                <div className={`text-lg font-bold ${result.prediction === 1 ? "text-green-400" : "text-red-400"}`}>
                  {result.prediction === 1 ? "Exoplanet" : "Not exoplanet"}
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-300">Probability:</div>
                <div className="text-md font-medium">{formatProbability(result.prediction, result.probability)}</div>
              </div>

              <div>
                <div className="text-xs text-gray-300 mb-1">SHAP values (opposing forces):</div>
                <div>
                  {result.shap_values
                    ? Object.entries(result.shap_values).map(([k, v]) => (
                        <ShapBar key={k} name={k} value={v} />
                      ))
                    : <div className="text-gray-400">No SHAP values provided.</div>}
                </div>
              </div>
            </div>
          )}
        </aside>

        <main className="flex-1 flex flex-col items-center">
          <div className="w-full h-[520px] rounded-2xl overflow-hidden relative border border-gray-800">
            <canvas ref={canvasRef} className="w-full h-full block" />

            {!result && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center text-gray-400">
                  <div className="text-xl">No model loaded</div>
                  <div className="text-sm mt-2">Submit an input to visualize result</div>
                </div>
              </div>
            )}
          </div>

          <div className="text-xs text-gray-400 mt-3">Models loaded from <code>/src/planets/</code> (exoplanet.glb / not_exoplanet.glb)</div>

          <form onSubmit={handleSubmit} className="w-full mt-6 max-w-3xl">
            <div className="bg-black/50 backdrop-blur-md p-4 rounded-2xl border border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-medium">Single prediction</div>
                <div className="flex items-center space-x-2">
                  <label className="text-xs text-gray-300">Amateur</label>
                  <input
                    type="radio"
                    name="mode"
                    checked={mode === "amateur"}
                    onChange={() => setMode("amateur")}
                    className="accent-yellow-400"
                  />
                  <input
                    type="radio"
                    name="mode2"
                    checked={mode === "professional"}
                    onChange={() => setMode("professional")}
                    className="accent-purple-400 ml-3"
                  />
                  <label className="text-xs text-gray-300 ml-1">Professional</label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {(mode === "professional" ? professionalFields : amateurFields).map((f) => (
                  <div key={f} className="flex flex-col">
                    <label className="text-xs text-gray-400 mb-1 capitalize">{f}</label>
                    <input
                      title={tooltips[f]}
                      placeholder={tooltips[f]}
                      value={inputs[f]}
                      onChange={(e) => handleInputChange(f, e.target.value)}
                      className="p-2 rounded-lg bg-black/60 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 text-white text-sm"
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between mt-4">
                <div className="text-xs text-gray-400">Hover any field to see what it means.</div>
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-purple-700 hover:bg-purple-600 rounded-md font-medium"
                    disabled={loading}
                  >
                    {loading ? "Predicting..." : "Predict"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInputs({
                        period: "",
                        duration: "",
                        depth: "",
                        prad: "",
                        steff: "",
                        srad: "",
                        mag: "",
                      });
                      setResult(null);
                      setError("");
                    }}
                    className="px-3 py-2 bg-gray-800 rounded-md text-sm"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
          </form>
        </main>

        <aside className="w-96 backdrop-blur-md bg-black/50 border border-gray-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="text-lg font-semibold">Inputs</div>
            <div className="text-sm text-gray-300">Mode: <span className="font-medium">{mode}</span></div>
          </div>

          <div className="text-sm text-gray-300 mb-3">Fields (hover to read explanation)</div>

          <div className="space-y-3">
            {(mode === "professional" ? professionalFields : amateurFields).map((f) => (
              <div key={f} className="flex items-center justify-between p-2 bg-black/30 rounded">
                <div>
                  <div className="font-medium lowercase">{f}</div>
                  <div className="text-xs text-gray-400">{tooltips[f]}</div>
                </div>
                <div className="text-xs text-gray-300">{inputs[f] || "-"}</div>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <div className="text-sm text-gray-300 mb-2">Last request</div>
            <div className="text-xs text-gray-400">
              <pre className="whitespace-pre-wrap text-xs">{result ? JSON.stringify(result, null, 2) : "No response yet."}</pre>
            </div>
          </div>
        </aside>
      </div>

      <footer className="p-6">
        <div className="max-w-4xl mx-auto bg-black/50 backdrop-blur-md border border-gray-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-md font-semibold">Bulk prediction (CSV)</div>
            <div className="text-xs text-gray-400">Select a CSV file and choose mode</div>
          </div>

          <div className="flex gap-3 items-center">
            <input type="file" accept=".csv" onChange={(e) => setBulkFile(e.target.files?.[0] || null)} className="text-sm" />
            <select value={bulkMode} onChange={(e) => setBulkMode(e.target.value)} className="p-2 bg-black/60 rounded">
              <option value="professional">Professional</option>
              <option value="amateur">Amateur</option>
            </select>
            <button onClick={handleBulkUpload} disabled={bulkLoading} className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 rounded">
              {bulkLoading ? "Processing..." : "Upload & Download Results"}
            </button>
            {bulkError && <div className="text-sm text-red-400">{bulkError}</div>}
          </div>

          <div className="text-xs text-gray-400 mt-3">
            The server will return a file for download. CSV must contain proper columns depending on mode.
          </div>
        </div>
      </footer>

      {showInstructions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="w-11/12 max-w-3xl bg-black/80 border border-gray-700 rounded-2xl p-6 relative">
            <button onClick={() => setShowInstructions(false)} className="absolute top-4 right-4 bg-gray-800 px-3 py-1 rounded">Close</button>
            <h2 className="text-xl font-semibold mb-3">Instructions</h2>
            <div className="text-sm text-gray-300 space-y-3">
              {/* CSV instructions оставляем полностью */}
              <p>The upload file <strong>must be CSV</strong>. For <strong>professional</strong> mode include columns separated by commas with header: <code>period,duration,depth,prad,steff,srad,mag</code>.</p>
              <p>For <strong>amateur</strong> mode include header: <code>period,duration,depth,mag</code>.</p>
              <p>Each row will be predicted and the server will return a CSV with results that will be downloaded automatically.</p>

              <h3 className="font-semibold mt-4">Classification Report</h3>
              <p className="font-semibold mt-2">For professional model:</p>
              <table className="table-auto border-collapse border border-gray-600 w-full text-sm">
                <thead>
                  <tr>
                    <th className="border border-gray-600 px-2 py-1">Class</th>
                    <th className="border border-gray-600 px-2 py-1">Precision</th>
                    <th className="border border-gray-600 px-2 py-1">Recall</th>
                    <th className="border border-gray-600 px-2 py-1">F1-Score</th>
                    <th className="border border-gray-600 px-2 py-1">Support</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-600 px-2 py-1">0</td>
                    <td className="border border-gray-600 px-2 py-1">0.94</td>
                    <td className="border border-gray-600 px-2 py-1">0.89</td>
                    <td className="border border-gray-600 px-2 py-1">0.92</td>
                    <td className="border border-gray-600 px-2 py-1">823</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-600 px-2 py-1">1</td>
                    <td className="border border-gray-600 px-2 py-1">0.85</td>
                    <td className="border border-gray-600 px-2 py-1">0.92</td>
                    <td className="border border-gray-600 px-2 py-1">0.88</td>
                    <td className="border border-gray-600 px-2 py-1">549</td>
                  </tr>
                  <tr className="font-semibold">
                    <td className="border border-gray-600 px-2 py-1">Accuracy</td>
                    <td colSpan={4} className="border border-gray-600 px-2 py-1">0.90 (1372 samples)</td>
                  </tr>
                  <tr className="font-semibold">
                    <td className="border border-gray-600 px-2 py-1">Macro Avg</td>
                    <td className="border border-gray-600 px-2 py-1">0.90</td>
                    <td className="border border-gray-600 px-2 py-1">0.91</td>
                    <td className="border border-gray-600 px-2 py-1">0.90</td>
                    <td className="border border-gray-600 px-2 py-1">1372</td>
                  </tr>
                  <tr className="font-semibold">
                    <td className="border border-gray-600 px-2 py-1">Weighted Avg</td>
                    <td className="border border-gray-600 px-2 py-1">0.91</td>
                    <td className="border border-gray-600 px-2 py-1">0.90</td>
                    <td className="border border-gray-600 px-2 py-1">0.90</td>
                    <td className="border border-gray-600 px-2 py-1">1372</td>
                  </tr>
                </tbody>
              </table>

              <p className="font-semibold mt-4">For amateur model:</p>
              <table className="table-auto border-collapse border border-gray-600 w-full text-sm">
                <thead>
                  <tr>
                    <th className="border border-gray-600 px-2 py-1">Class</th>
                    <th className="border border-gray-600 px-2 py-1">Precision</th>
                    <th className="border border-gray-600 px-2 py-1">Recall</th>
                    <th className="border border-gray-600 px-2 py-1">F1-Score</th>
                    <th className="border border-gray-600 px-2 py-1">Support</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-600 px-2 py-1">0</td>
                    <td className="border border-gray-600 px-2 py-1">0.91</td>
                    <td className="border border-gray-600 px-2 py-1">0.86</td>
                    <td className="border border-gray-600 px-2 py-1">0.89</td>
                    <td className="border border-gray-600 px-2 py-1">854</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-600 px-2 py-1">1</td>
                    <td className="border border-gray-600 px-2 py-1">0.80</td>
                    <td className="border border-gray-600 px-2 py-1">0.87</td>
                    <td className="border border-gray-600 px-2 py-1">0.84</td>
                    <td className="border border-gray-600 px-2 py-1">549</td>
                  </tr>
                  <tr className="font-semibold">
                    <td className="border border-gray-600 px-2 py-1">Accuracy</td>
                    <td colSpan={4} className="border border-gray-600 px-2 py-1">0.87 (1403 samples)</td>
                  </tr>
                  <tr className="font-semibold">
                    <td className="border border-gray-600 px-2 py-1">Macro Avg</td>
                    <td className="border border-gray-600 px-2 py-1">0.86</td>
                    <td className="border border-gray-600 px-2 py-1">0.87</td>
                    <td className="border border-gray-600 px-2 py-1">0.86</td>
                    <td className="border border-gray-600 px-2 py-1">1403</td>
                  </tr>
                  <tr className="font-semibold">
                    <td className="border border-gray-600 px-2 py-1">Weighted Avg</td>
                    <td className="border border-gray-600 px-2 py-1">0.87</td>
                    <td className="border border-gray-600 px-2 py-1">0.87</td>
                    <td className="border border-gray-600 px-2 py-1">0.87</td>
                    <td className="border border-gray-600 px-2 py-1">1403</td>
                  </tr>
                </tbody>
              </table>

              <p className="mt-2 text-gray-400 text-xs">Hover over the headers to see explanations of each metric.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}