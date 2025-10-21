
const readline = require("readline");

class ConsoleIO {
  constructor() {
    this.rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  }
  ask(question) {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => resolve(answer));
    });
  }
  close() {
    this.rl.close();
  }
}

const Estado = Object.freeze({
  PENDIENTE: { code: "P", label: "Pendiente" },
  EN_CURSO: { code: "E", label: "En curso" },
  TERMINADA: { code: "T", label: "Terminada" },
  CANCELADA: { code: "C", label: "Cancelada" },
});

const EstadoDesdeEntrada = (value) => {
  if (!value) return null;
  const v = value.trim().toUpperCase();
  if (v === "P" || v === "PENDIENTE") return Estado.PENDIENTE;
  if (v === "E" || v === "EN CURSO" || v === "EN_CURSO") return Estado.EN_CURSO;
  if (v === "T" || v === "TERMINADA") return Estado.TERMINADA;
  if (v === "C" || v === "CANCELADA") return Estado.CANCELADA;
  return null;
};

const Dificultad = Object.freeze({
  FACIL: { code: 1, label: "Fácil", stars: "★☆☆" },
  MEDIO: { code: 2, label: "Medio", stars: "★★☆" },
  DIFICIL: { code: 3, label: "Difícil", stars: "★★★" },
});

const DificultadDesdeEntrada = (value) => {
  if (!value) return null;
  const v = value.toString().trim().toUpperCase();
  if (v === "1" || v === "F" || v === "FACIL" || v === "FÁCIL") return Dificultad.FACIL;
  if (v === "2" || v === "M" || v === "MEDIO") return Dificultad.MEDIO;
  if (v === "3" || v === "D" || v === "DIFICIL" || v === "DIFÍCIL") return Dificultad.DIFICIL;
  return null;
};

class Tarea {
  /**
   * @param {string} titulo (obligatorio, 1..100)
   * @param {string|null} descripcion (0..500)
   * @param {object} estado (enum Estado)
   * @param {Date|null} vencimiento
   * @param {object} dificultad (enum Dificultad)
   */
  constructor({ titulo, descripcion = null, estado = Estado.PENDIENTE, vencimiento = null, dificultad = Dificultad.FACIL }) {
    // Validaciones básicas tipo Java
    if (!titulo || typeof titulo !== "string" || titulo.trim().length === 0 || titulo.trim().length > 100) {
      throw new Error("Título inválido: obligatorio, 1..100 caracteres.");
    }
    if (descripcion !== null && descripcion !== undefined) {
      if (typeof descripcion !== "string" || descripcion.length > 500) {
        throw new Error("Descripción inválida: hasta 500 caracteres.");
      }
    }
    this.titulo = titulo.trim();
    this.descripcion = descripcion && descripcion.trim().length > 0 ? descripcion.trim() : null;
    this.estado = estado || Estado.PENDIENTE;
    this.creacion = new Date();
    this.ultimaEdicion = new Date(this.creacion);
    this.vencimiento = vencimiento instanceof Date ? vencimiento : null;
    this.dificultad = dificultad || Dificultad.FACIL;
  }

  actualizar({ descripcion, estado, dificultad, vencimiento }) {
    // Reglas de blank/space:
    // - Si input === "" => mantener
    // - Si input === " " (un espacio) => setear null (cuando aplique)

    if (descripcion !== undefined) {
      if (descripcion === "") {
        // mantener
      } else if (descripcion === " ") {
        this.descripcion = null;
      } else {
        if (descripcion.length > 500) throw new Error("Descripción inválida: hasta 500 caracteres.");
        this.descripcion = descripcion.trim();
      }
    }

    if (estado !== undefined) {
      if (estado === "") {
        // mantener
      } else {
        const e = EstadoDesdeEntrada(estado);
        if (!e) throw new Error("Estado inválido. Use P/E/T/C o su nombre.");
        this.estado = e;
      }
    }

    if (dificultad !== undefined) {
      if (dificultad === "") {
        // mantener
      } else {
        const d = DificultadDesdeEntrada(dificultad);
        if (!d) throw new Error("Dificultad inválida. Use 1/2/3 o F/M/D.");
        this.dificultad = d;
      }
    }

    if (vencimiento !== undefined) {
      if (vencimiento === "") {
        // mantener
      } else if (vencimiento === " ") {
        this.vencimiento = null;
      } else {
        const fecha = parseFecha(vencimiento);
        if (!fecha) throw new Error("Fecha de vencimiento inválida.");
        this.vencimiento = fecha;
      }
    }

    this.ultimaEdicion = new Date();
  }
}

class TareaRepositorio {
  constructor() {
    /** @type {Tarea[]} */
    this.tareas = [];
  }
  add(tarea) {
    this.tareas.push(tarea);
  }
  getAll() {
    return [...this.tareas];
  }
  getByIndex(index) {
    if (index < 0 || index >= this.tareas.length) return null;
    return this.tareas[index];
  }
  filterByEstado(estado) {
    return this.tareas.filter((t) => t.estado === estado);
  }
  searchByTitle(substr) {
    const q = substr.trim().toLowerCase();
    return this.tareas.filter((t) => t.titulo.toLowerCase().includes(q));
  }
}

/** Utilidades de fecha e impresión **/
function parseFecha(input) {
  //   formatos:
  // - YYYY-MM-DD
  // - YYYY-MM-DD HH:mm
  // - DD/MM/YYYY
  // - DD/MM/YYYY HH:mm
  if (!input) return null;
  const s = input.trim();
  
  const isoCandidate = s.match(/^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2})?$/);
  if (isoCandidate) {
    const normalized = s.replace(" ", "T");
    const d = new Date(normalized);
    if (!isNaN(d.getTime())) return d;
  }
  const dmy = s.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?$/);
  if (dmy) {
    const day = parseInt(dmy[1], 10);
    const month = parseInt(dmy[2], 10) - 1;
    const year = parseInt(dmy[3], 10);
    const hours = dmy[4] ? parseInt(dmy[4], 10) : 0;
    const minutes = dmy[5] ? parseInt(dmy[5], 10) : 0;
    const d = new Date(year, month, day, hours, minutes);
    if (!isNaN(d.getTime())) return d;
  }
  // Intento final con Date nativo
  const fallback = new Date(s);
  if (!isNaN(fallback.getTime())) return fallback;
  return null;
}

function formatFecha(d) {
  if (!d) return "Sin datos";
  const pad = (n) => (n < 10 ? "0" + n : n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function mostrarDificultad(d) {
  if (!d) return "Sin datos";
  return `${d.label} (${d.stars})`;
}


class ToDoApp {
  constructor(io, repo) {
    this.io = io;
    this.repo = repo;
    this.username = "Usuario"; 
  }

  async run() {
    await this.seedDemo();
    let salir = false;
    while (!salir) {
      console.clear();
      console.log(`¡Hola ${this.username}!\n`);
      console.log("¿Qué desea hacer?\n");
      console.log("[1] Ver mis tareas");
      console.log("[2] Buscar una tarea");
      console.log("[3] Agregar una tarea");
      console.log("[0] Salir\n");
      const op = (await this.io.ask("> ")).trim();
      switch (op) {
        case "1":
          await this.menuVerMisTareas();
          break;
        case "2":
          await this.menuBuscarTarea();
          break;
        case "3":
          await this.menuAgregarTarea();
          break;
        case "0":
          salir = true;
          break;
        default:
          await this.pauseMsg("Opción inválida. Intente nuevamente.");
      }
    }
    this.io.close();
    console.log("¡Hasta luego!");
  }

  async menuVerMisTareas() {
    let volver = false;
    while (!volver) {
      console.clear();
      console.log("¿Qué tarea desea ver?\n");
      console.log("[1] Todas");
      console.log("[2] Pendientes");
      console.log("[3] En curso");
      console.log("[4] Terminadas");
      console.log("[0] Volver\n");
      const op = (await this.io.ask("> ")).trim();
      switch (op) {
        case "1":
          await this.listadoTareas(this.repo.getAll(), "Todas tus tareas");
          break;
        case "2":
          await this.listadoTareas(this.repo.filterByEstado(Estado.PENDIENTE), "Tareas Pendientes");
          break;
        case "3":
          await this.listadoTareas(this.repo.filterByEstado(Estado.EN_CURSO), "Tareas En curso");
          break;
        case "4":
          await this.listadoTareas(this.repo.filterByEstado(Estado.TERMINADA), "Tareas Terminadas");
          break;
        case "0":
          volver = true;
          break;
        default:
          await this.pauseMsg("Opción inválida. Intente nuevamente.");
      }
    }
  }

  async listadoTareas(tareas, titulo) {
    // Orden por defecto: alfabético ascendente
    const ordenadas = [...tareas].sort((a, b) => a.titulo.localeCompare(b.titulo, undefined, { sensitivity: "base" }));
    let volver = false;
    while (!volver) {
      console.clear();
      console.log(`${titulo}.\n`);
      if (ordenadas.length === 0) {
        console.log("(No hay tareas para mostrar)\n");
        await this.pauseMsg("Presiona Enter para volver...");
        return;
      }
      ordenadas.forEach((t, i) => {
        console.log(`[${i + 1}] ${t.titulo}`);
      });
      console.log("\n¿Deseas ver los detalles de alguna?");
      console.log("Introduce el número para verla o 0 para volver.");
      const op = (await this.io.ask("> ")).trim();
      if (op === "0") return;
      const idx = Number.parseInt(op, 10);
      if (Number.isNaN(idx) || idx < 1 || idx > ordenadas.length) {
        await this.pauseMsg("Opción inválida. Intente nuevamente.");
        continue;
      }
      const tarea = ordenadas[idx - 1];
      await this.menuDetallesTarea(tarea);
    }
  }

  async menuDetallesTarea(tarea) {
    let volver = false;
    while (!volver) {
      console.clear();
      console.log("Esta es la tarea que elegiste.\n");
      console.log(`\t${tarea.titulo}`);
      console.log(`\t${tarea.descripcion ? tarea.descripcion : "(Sin descripción)"}`);
      console.log(`\tEstado: ${tarea.estado.label}`);
      console.log(`\tDificultad: ${mostrarDificultad(tarea.dificultad)}`);
      console.log(`\tVencimiento: ${tarea.vencimiento ? formatFecha(tarea.vencimiento) : "Sin datos"}`);
      console.log(`\tCreación: ${formatFecha(tarea.creacion)}`);
      console.log(`\tÚltima edición: ${formatFecha(tarea.ultimaEdicion)}\n`);
      console.log("Si deseas editarla selecciona E, si no 0 para volver");
      const op = (await this.io.ask("> ")).trim().toUpperCase();
      if (op === "0") return;
      if (op === "E") {
        await this.menuEdicionTarea(tarea);
      } else {
        await this.pauseMsg("Opción inválida. Intente nuevamente.");
      }
    }
  }

  async menuEdicionTarea(tarea) {
    while (true) {
      console.clear();
      console.log(`Estas editando la tarea: ${tarea.titulo}`);
      console.log(" - Si deseas mantener los valores de un atributo simplemente dejalo en blanco");
      console.log(" - Si deseas dejar en blanco un atributo, escribe un espacio");
      console.log("");

      const nuevaDesc = await this.io.ask("1. Ingresa la descripción: ");
      const nuevoEstado = await this.io.ask("2. Estado([P]endiente/[E]n curso/[T]erminada/[C]ancelada): ");
      const nuevaDific = await this.io.ask("3. Dificultad([1]/[2]/[3]): ");
      const nuevoVenc = await this.io.ask("4. Vencimiento (YYYY-MM-DD o DD/MM/YYYY opcional HH:mm): ");

      try {
        tarea.actualizar({ descripcion: nuevaDesc, estado: nuevoEstado, dificultad: nuevaDific, vencimiento: nuevoVenc });
        console.log("\n¡Datos guardados!");
        await this.pauseMsg("Presiona Enter para continuar...");
        return;
      } catch (e) {
        console.log(`\nError: ${e.message}`);
        const retry = (await this.io.ask("¿Deseas reintentar? (S/N): ")).trim().toUpperCase();
        if (retry !== "S") return;
      }
    }
  }

  async menuBuscarTarea() {
    while (true) {
      console.clear();
      console.log("Introduce el título de una tarea para buscarla");
      const q = await this.io.ask("> ");
      const query = q.trim();
      if (query.length === 0) {
        const back = (await this.io.ask("Búsqueda vacía. ¿Volver? (S/N): ")).trim().toUpperCase();
        if (back === "S") return;
        continue;
      }
      const resultados = this.repo.searchByTitle(query);
      if (resultados.length === 0) {
        console.log("\nNo hay tareas relacionadas con la búsqueda.\n");
        await this.pauseMsg("Presiona Enter para continuar...");
        return;
      }
      await this.listadoTareas(resultados, "Estas son las tareas relacionadas");
      return;
    }
  }

  async menuAgregarTarea() {
    while (true) {
      console.clear();
      console.log("Estas creando una nueva tarea.\n");
      const titulo = (await this.io.ask("1. Ingresa el título: ")).trim();
      const descripcion = await this.io.ask("2. Ingresa la descripción: ");
      const estadoIn = await this.io.ask("3. Estado ([P]endiente/[E]n curso/[T]erminada/[C]ancelada) [Enter para P]: ");
      const dificIn = await this.io.ask("4. Dificultad ([1]/[2]/[3]) [Enter para 1]: ");
      const vencIn = await this.io.ask("5. Vencimiento (YYYY-MM-DD o DD/MM/YYYY opcional HH:mm) [opcional]: ");

      try {
        if (!titulo || titulo.length === 0 || titulo.length > 100) {
          throw new Error("Título inválido: obligatorio, 1..100 caracteres.");
        }
        let estado = estadoIn.trim() === "" ? Estado.PENDIENTE : EstadoDesdeEntrada(estadoIn);
        if (!estado) throw new Error("Estado inválido. Use P/E/T/C o su nombre.");
        let dificultad = dificIn.trim() === "" ? Dificultad.FACIL : DificultadDesdeEntrada(dificIn);
        if (!dificultad) throw new Error("Dificultad inválida. Use 1/2/3 o F/M/D.");
        let vencimiento = null;
        if (vencIn && vencIn.trim() !== "") {
          const f = parseFecha(vencIn);
          if (!f) throw new Error("Fecha de vencimiento inválida.");
          vencimiento = f;
        }
        const tarea = new Tarea({ titulo, descripcion, estado, dificultad, vencimiento });
        this.repo.add(tarea);
        console.log("\n¡Datos guardados!");
        await this.pauseMsg("Presiona Enter para continuar...");
        return;
      } catch (e) {
        console.log(`\nError: ${e.message}`);
        const retry = (await this.io.ask("¿Deseas reintentar? (S/N): ")).trim().toUpperCase();
        if (retry !== "S") return;
      }
    }
  }

  async pauseMsg(msg) {
    await this.io.ask(`\n${msg}`);
  }

  async seedDemo() {
    // Datos iniciales de ejemplo
    if (this.repo.getAll().length > 0) return;
    const t1 = new Tarea({ titulo: "Comprar Huevos", descripcion: "Ir al súper y comprar una docena", estado: Estado.PENDIENTE, dificultad: Dificultad.FACIL });
    const t2 = new Tarea({ titulo: "Pasear al perro", descripcion: "Ejercitar 30 minutos", estado: Estado.EN_CURSO, dificultad: Dificultad.MEDIO, vencimiento: parseFecha("2025-12-01 18:00") });
    const t3 = new Tarea({ titulo: "Terminar práctico de BD", descripcion: null, estado: Estado.TERMINADA, dificultad: Dificultad.DIFICIL });
    this.repo.add(t1);
    this.repo.add(t2);
    this.repo.add(t3);
  }
}

// --- Main ---
(async function main() {
  const io = new ConsoleIO();
  const repo = new TareaRepositorio();
  const app = new ToDoApp(io, repo);
  await app.run();
})();
