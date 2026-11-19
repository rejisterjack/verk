const vscode = require("vscode");

async function signIn() {
  const base = await vscode.window.showInputBox({
    prompt: "Verk URL",
    value: "http://localhost:3000",
  });
  const teamId = await vscode.window.showInputBox({ prompt: "Team id" });
  const key = await vscode.window.showInputBox({
    prompt: "API key",
    password: true,
  });

  if (!base || !teamId || !key) return;
  await vscode.workspace.getConfiguration("verk").update("baseUrl", base, true);
  await vscode.workspace.getConfiguration("verk").update("teamId", teamId, true);
  await vscode.workspace
    .getConfiguration("verk")
    .update("apiKey", key, true);
  vscode.window.showInformationMessage("Verk is signed in on this machine.");
}

async function createIssue() {
  const config = vscode.workspace.getConfiguration("verk");
  const base = String(config.get("baseUrl") || "").replace(/\/$/, "");
  const teamId = String(config.get("teamId") || "");
  const apiKey = String(config.get("apiKey") || "");

  if (!base || !teamId || !apiKey) {
    await signIn();

    return;
  }
  const title = await vscode.window.showInputBox({ prompt: "Issue title" });

  if (!title) return;
  const response = await fetch(`${base}/api/teams/${teamId}/issues`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title }),
  });

  if (!response.ok) {
    vscode.window.showErrorMessage(`Verk could not create the issue (${response.status}).`);

    return;
  }
  const issue = await response.json();
  const url =
    issue.url ||
    `${base}/t/${issue.teamSlug || "team"}/issues/${issue.number || issue.id}`;

  await vscode.env.openExternal(vscode.Uri.parse(url));
}

function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand("verk.signIn", signIn),
    vscode.commands.registerCommand("verk.createIssue", createIssue),
  );
}

module.exports = { activate };
