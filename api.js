const express = require("express");
const app = express();
const mysql = require("mysql2/promise");
const bcrypt = require("bcrypt");
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

async function getDBConnection() {
  return await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "mydb",
  });
}

app.get("/", (req, res) => {
  res.send(`<h1>Wallahi</h1>
  ALLA ROUTES:
  <ul>
  <li>GET /greet ---------- En liten hälsning</li>
  <li>GET /users ---------- En lista av alla användare, endast användarnamn</li>
  <li>GET /formular ------ Välj och kolla på en viss användare</li>
  <li>GET /updateUser -- Byt ut informationen hos en viss användare</li>
  <li>GET /login ---------- Logga in</li>
  <li>POST /upload ------ Laddar upp användaren john</li>
  </ul>`);
});

app.get("/formular", async function (req, res) {
  res.send(`<h1>Vilken användare vill du kolla på?</h1>
    <form action="/resultat" method="GET">
        <input type="text" placeholder="Välj id" name="id" id="id">
        <button id="btn">Hämta</button>
    </form>`);
});

app.get("/resultat", async function (req, res) {
  const id = req.query.id;

  try {
    const connection = await getDBConnection();
    const [rows] = await connection.execute(
      "SELECT * FROM users WHERE id = ?",
      [id]
    );

    if (rows.length === 0) {
      res.status(404).send("Det finns ingen användare med det id:et");
    } else {
      res.json(rows[0]);
    }
  } catch (error) {
    console.error("Fel vid hämtning av användare:", error);
    res.status(500).send("Internt serverfel");
  }
});

app.get("/greet", (req, res) => {
  res.send("melle = bumbaclart");
});

app.get("/users", async function (req, res) {
  try {
    const connection = await getDBConnection();
    const [rows] = await connection.execute("SELECT username FROM users");
    const usernames = rows.map((row) => row.username).join(", ");
    res.send(usernames);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Internt serverfel" });
  }
});

app.post("/upload", async function (req, res) {
  try {
    const connection = await getDBConnection();
    const hashedPassword = await bcrypt.hash("abcdefg", 10);
    await connection.execute(
      'INSERT INTO users (username, email, password) VALUES ("John", "john@gmail.com", ?)',
      [hashedPassword]
    );
    res.send("User uploaded");
  } catch (error) {
    console.error("Nåt gick inte så bra:", error);
    res.status(500).json({ error: "Nåt fick fel" });
  }
});

app.get("/updateUser", async function (req, res) {
  try {
    res.send(`
      <h1>Uppdatera användare</h1>
      <form id="updateForm">
          <input type="text" placeholder="Vilket id vill du ändra?" name="id" required>
          <input type="text" placeholder="Nytt användarnamn" name="username" required>
          <input type="text" placeholder="Ny email" name="email" required>
          <input type="text" placeholder="Nytt lösenord" name="password" required>
          <button type="submit">Uppdatera</button>
      </form>
      <script>
        document.getElementById('updateForm').addEventListener('submit', async function(event) {
          event.preventDefault();
          const formData = new FormData(event.target);
          const data = {
            id: formData.get('id'),
            username: formData.get('username'),
            email: formData.get('email'),
            password: formData.get('password')
          };
          const response = await fetch('/uppdateradAnvandare', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
          });
          const result = await response.text();
          alert(result);
        });
      </script>
    `);
  } catch (error) {
    console.error("Nåt gick inte så bra:", error);
    res.status(500).json({ error: "Nåt gick fel" });
  }
});

app.put("/uppdateradAnvandare", async function (req, res) {
  const idAttUppdatera = req.body.id;
  const nyttAnvändarnamn = req.body.username;
  const nyEmail = req.body.email;
  const nyPassword = req.body.password;

  try {
    const connection = await getDBConnection();
    const hashedPassword = await bcrypt.hash(nyPassword, 10);
    const [result] = await connection.execute(
      "UPDATE users SET username = ?, email = ?, password = ? WHERE id = ?",
      [nyttAnvändarnamn, nyEmail, hashedPassword, idAttUppdatera]
    );

    if (result.affectedRows === 0) {
      res.status(404).send("det finns ingen användare med det ID:et.");
    } else {
      res.send("Uppdateringen lyckades");
    }
  } catch (error) {
    console.error("Fel vid uppdatering av användare:", error);
    res
      .status(500)
      .json({ error: "Internt serverfel: Ingen användare hittades med id:et" });
  }
});

app.get("/login", async function (req, res) {
  try {
    res.send(`
<h1>Logga in</h1>
<form id="loginForm">
    <input type="text" placeholder="Email" name="email" required>
    <input type="password" placeholder="Lösenord" name="password" required>
    <button type="submit">Logga in</button>
</form>
<script>
  document.getElementById('loginForm').addEventListener('submit', async function(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = {
      email: formData.get('email'),
      password: formData.get('password')
    };
    const response = await fetch('/loginResultat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    const result = await response.text();
    alert(result);
  });
</script>
`);
  } catch (error) {
    console.error("Nåt gick inte så bra:", error);
    res.status(500).json({ error: "Nåt gick fel" });
  }
});

app.post("/loginResultat", async function (req, res) {
  const emailInput = req.body.email;
  const passwordInput = req.body.password;

  try {
    const connection = await getDBConnection();
    const [rows] = await connection.execute(
      "SELECT * FROM users WHERE email = ?",
      [emailInput]
    );

    if (rows.length === 0) {
      res.status(404).send("Ingen användare hittades med den angivna emailen.");
    } else {
      const user = rows[0];
      const passwordMatch = await bcrypt.compare(passwordInput, user.password);

      if (passwordMatch) {
        const userInfo = {
          id: user.id,
          username: user.username,
          email: user.email,
        };
        res
          .status(200)
          .json({ message: "Inloggningen lyckades", user: userInfo });
      } else {
        res.status(401).send("Felaktigt lösenord.");
      }
    }
  } catch (error) {
    console.error("Fel vid inloggning:", error);
    res.status(500).json({ error: "Internt serverfel" });
  }
});

const port = 3000;
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
