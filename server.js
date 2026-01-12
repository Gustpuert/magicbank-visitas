require("dotenv").config();
const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const app = express();
const PORT = process.env.PORT || 8080;

/* =========================
   MIDDLEWARE
========================= */
app.use(cors());
app.use(express.json());

/* =========================
   MEMORIA TEMPORAL DE VISITAS
   (simple y segura para demo)
========================= */
const visitas = new Map();

/* =========================
   MAILER
========================= */
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: process.env.MAIL_PORT,
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

/* =========================
   HEALTH
========================= */
app.get("/", (_, res) => {
  res.send("MagicBank Visitas Backend OK");
});

/* =========================
   SOLICITUD DE VISITA
========================= */
app.post("/visita/solicitar", async (req, res) => {
  const { nombre, correo } = req.body;

  if (!nombre || !correo) {
    return res.status(400).json({ error: "Datos incompletos" });
  }

  const clave = crypto.randomBytes(3).toString("hex").toUpperCase();
  const inicio = Date.now();
  const duracion = parseInt(process.env.VISITA_MINUTOS, 10) * 60 * 1000;

  visitas.set(clave, {
    nombre,
    correo,
    inicio,
    duracion,
  });

  try {
    await transporter.sendMail({
      from: `"MagicBank" <${process.env.MAIL_USER}>`,
      to: correo,
      subject: "Acceso a Visita Guiada MagicBank",
      html: `
        <p>Hola <strong>${nombre}</strong>,</p>

        <p>Has solicitado una <strong>visita guiada temporal</strong> a MagicBank.</p>

        <p><strong>Clave de acceso:</strong> ${clave}</p>

        <p>
          Accede aquí:<br>
          <a href="${process.env.FRONT_ACCESS_URL}">
            ${process.env.FRONT_ACCESS_URL}
          </a>
        </p>

        <p>
          La visita tiene una duración de <strong>${process.env.VISITA_MINUTOS} minutos</strong>.
          Al finalizar, serás redirigido automáticamente.
        </p>

        <p>Gracias por tu interés en MagicBank.</p>
      `,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error enviando correo" });
  }
});

/* =========================
   VALIDAR CLAVE
========================= */
app.post("/visita/validar", (req, res) => {
  const { clave } = req.body;

  const visita = visitas.get(clave);
  if (!visita) {
    return res.status(403).json({ error: "Clave inválida" });
  }

  const ahora = Date.now();
  if (ahora - visita.inicio > visita.duracion) {
    visitas.delete(clave);
    return res.status(403).json({ error: "Clave expirada" });
  }

  res.json({
    ok: true,
    restante: visita.duracion - (ahora - visita.inicio),
    feedback: process.env.FEEDBACK_URL,
  });
});

/* =========================
   START
========================= */
app.listen(PORT, () => {
  console.log(`🚀 MagicBank Visitas corriendo en puerto ${PORT}`);
});