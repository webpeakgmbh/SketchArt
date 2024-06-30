// Modul-Imports und Setup
import React, { useRef, useEffect, useState, Fragment } from 'react';
import { UploadManager, Configuration } from 'upload-js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy, faUndo, faTrash, faDownload } from '@fortawesome/free-solid-svg-icons';
import Link from 'next/link';
import Loader from 'react-loader-spinner';
import 'react-loader-spinner/dist/loader/css/react-spinner-loader.css';

// Lokale Komponente zur Anzeige von Ladeanimationen
function LoadingSpinner() {
  return <Loader type="ThreeDots" color="#00BFFF" height={80} width={80} />;
}

// Ergebniskomponente, die Vorhersagen anzeigt
function Results({ predictions, submissionCount }) {
  const resultRef = useRef(null);

  useEffect(() => {
    if (submissionCount > 0) {
      resultRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [predictions, submissionCount]);

  if (submissionCount === 0) return null;

  return (
    <section className="w-full my-10">
      <h2 className="m-6 text-3xl font-bold text-center">Results</h2>
      {submissionCount > Object.keys(predictions).length && (
        <div className="w-full pb-10 mx-auto text-center">
          <div className="pt-10" ref={resultRef}></div>
          <LoadingSpinner />
        </div>
      )}
      {Object.values(predictions).reverse().map((prediction, index) => (
        <Fragment key={prediction.id}>
          {index === 0 && submissionCount === Object.keys(predictions).length && (
            <div ref={resultRef}></div>
          )}
          <Result prediction={prediction} />
        </Fragment>
      ))}
    </section>
  );
}

// Einzelne Vorhersagekomponente
function Result({ prediction, showLinkToNewScribble = false }) {
  const [linkCopied, setLinkCopied] = useState(false);

  const handleCopyLink = () => {
    const link = `${window.location.origin}/clickart/${prediction.uuid || prediction.id}`;
    navigator.clipboard.writeText(link);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 4000);
  };

  if (!prediction) return null;

  return (
    <div className="mt-6 mb-12">
      <div className="flex p-5 my-5 bg-white border shadow-lg">
        <div className="relative w-1/2 border aspect-square">
          <img src={prediction.input.image} alt="input scribble" className="w-full aspect-square" />
        </div>
        <div className="relative w-1/2 aspect-square">
          {prediction.output?.length ? (
            <img src={prediction.output[prediction.output.length - 1]} alt="output image" className="w-full aspect-square" />
          ) : (
            <div className="grid h-full place-items-center">
              <LoadingSpinner />
            </div>
          )}
        </div>
      </div>
      <div className="px-4 text-xl text-center opacity-60">
        {`“${prediction.input.prompt}”`}
      </div>
      <div className="py-2 text-center">
        <button className="lil-button" onClick={handleCopyLink}>
          <FontAwesomeIcon icon={faCopy} className="icon" /> {linkCopied ? "Copied!" : "Copy link"}
        </button>
        <Link href="https://t.me/Click_Art" passHref>
          <a className="lil-button">
            <FontAwesomeIcon icon={faTelegram} className="icon" /> Send TG
          </a>
        </Link>
        {showLinkToNewScribble && (
          <Link href="/" passHref>
            <button className="lil-button" onClick={handleCopyLink}>
              <FontAwesomeIcon icon={faPlus} className="icon" /> Create a new ClickArt
            </button>
          </Link>
        )}
      </div>
    </div>
  );
}

// Zeichenbereich-Komponente
function DrawingArea({ startingPaths, onScribble, scribbleExists, setScribbleExists }) {
  const sketchCanvasRef = useRef(null);

  useEffect(() => {
    const canvasElement = document.querySelector("#react-sketch-canvas__stroke-group-0");
    canvasElement?.removeAttribute("mask");
    loadPaths();
  }, []);

  const loadPaths = async () => {
    await sketchCanvasRef.current.loadPaths(startingPaths);
    setScribbleExists(true);
    exportPaths();
  };

  const exportPaths = async () => {
    const paths = await sketchCanvasRef.current.exportPaths();
    localStorage.setItem("paths", JSON.stringify(paths, null, 2));
    if (!paths.length) return;
    setScribbleExists(true);
    const image = await sketchCanvasRef.current.exportImage("png");
    onScribble(image);
  };

  const handleUndo = () => {
    sketchCanvasRef.current.undo();
  };

  const handleClear = () => {
    setScribbleExists(false);
    sketchCanvasRef.current.resetCanvas();
  };

  return (
    <div className="relative">
      {!scribbleExists && (
        <div className="absolute grid w-full h-full p-3 place-items-center pointer-events-none text-xl">
          <span className="opacity-40">Draw something here.</span>
        </div>
      )}
      <ReactSketchCanvas
        ref={sketchCanvasRef}
        className="w-full aspect-square border-none cursor-crosshair"
        strokeWidth={4}
        strokeColor="black"
        onChange={exportPaths}
        withTimestamp
      />
      {scribbleExists && (
        <div className="animate-in fade-in duration-700 text-left">
          <button className="lil-button" onClick={handleUndo}>
            <FontAwesomeIcon icon={faUndo} className="icon" /> Undo
          </button>
          <button className="lil-button" onClick={handleClear}>
            <FontAwesomeIcon icon={faTrash} className="icon" /> Clear
          </button>
        </div>
      )}
    </div>
  );
}

// Eingabeformular-Komponente
function PromptForm({ initialPrompt, onSubmit, scribbleExists }) {
  const [prompt, setPrompt] = useState(initialPrompt);

  useEffect(() => {
    setPrompt(initialPrompt);
  }, [initialPrompt]);

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(event);
  };

  const isSubmitDisabled = !scribbleExists || !prompt.length;

  return (
    <form onSubmit={handleSubmit} className="animate-in fade-in duration-700">
      <div className="flex mt-4">
        <input
          id="prompt-input"
          type="text"
          name="prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the image you want to create..."
          className="block w-full flex-grow rounded-l-md"
        />
        <button
          className={`bg-black text-white rounded-r-md text-small inline-block px-5 py-3 flex-none ${isSubmitDisabled ? "opacity-20 cursor-not-allowed" : ""}`}
          type="submit"
          disabled={isSubmitDisabled}
        >
          Go
        </button>
      </div>
    </form>
  );
}

// Fehleranzeige-Komponente
function ErrorMessage({ error }) {
  if (!error) return null;

  return (
    <div className="mx-auto w-full">
      <p className="bold text-red-500 pb-5">{error}</p>
    </div>
  );
}

// Upload-Funktion
async function handleUpload(imageData) {
  const uploadManager = new UploadManager(new Configuration({ apiKey: "public_FW25c7JGSpwAeGyR14huNQPEPHWr" }));
  const fileBuffer = dataURItoBuffer(imageData);

  const uploadResponse = await uploadManager.upload({
    accountId: "FW25c7J",
    data: fileBuffer,
    mime: "image/png",
    originalFileName: "scribble_input.png",
    path: {
      folderPath: "/uploads/some-folder/{UTC_DATE}",
      fileName: "{ORIGINAL_FILE_NAME}_{UNIQUE_DIGITS_8}{ORIGINAL_FILE_EXT}"
    },
    metadata: {
      userAgent: navigator.userAgent
    }
  });

  return uploadResponse.fileUrl;
}

// Hilfsfunktion zum Konvertieren von Data URI zu Buffer
function dataURItoBuffer(dataURI) {
  const base64String = dataURI.split(',')[1];
  const binaryString = atob(base64String);
  const byteArray = new Uint8Array(binaryString.length);

  for (let i = 0; i < binaryString.length; i++) {
    byteArray[i] = binaryString.charCodeAt(i);
  }

  return byteArray.buffer;
}

export {
  DrawingArea,
  PromptForm,
  ErrorMessage,
  Results,
  Result,
  handleUpload,
  dataURItoBuffer
};
