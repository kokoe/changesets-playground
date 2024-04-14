import fs from "fs";
import path from "path";
import { exec } from "child_process";

function execCallback(stepName) {
  return (err, stdout, stderr) => {
    if (err) {
      console.error(`${stepName} Error: ${err.message}`);
      return;
    } else if (stderr) {
      console.error(`${stepName} stderr: ${stderr}`);
      return;
    }
    console.log(`${stepName} stdout: ${stdout}`);
  };
}

/**
 * ---
 * "changesets-playground": ${patch | minor | major}
 * ---
 * message
 *
 * .changeset/*.md というファイルから、patch | minor | majorを取得して
 * 1. major
 * 2. minor
 * 3. patch
 * の優先度で、最初に見つかったものを返す
 */
function getVersionFromChangeset() {
  console.log("## getVersionFromChangeset");
  const order = ["major", "minor", "patch"];

  const dir = path.join(process.cwd(), ".changeset");
  const changesetFiles = fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".md"));

  const versions = changesetFiles.reduce((acc, file) => {
    const filePath = path.join(dir, file);
    const content = fs.readFileSync(filePath, "utf8");
    const match = content.match(
      /changesets-playground"\s*:\s*(patch|minor|major)/
    );
    if (match && acc.some((v) => v === match[1])) {
      acc.push(match[1]);
    }
    return acc;
  }, []);

  const version = order.find((v) => versions.includes(v));

  return version || "patch";
}

function execNpmVersion(version) {
  console.log("## execNpmVersion. version", version);
  exec(
    `pnpm version ${version} --no-commit-hooks --no-git-tag-version`,
    execCallback("execNpmVersion")
  );
}

function getNextVersionNo() {
  console.log("## getNextVersionNo");
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8")
  );
  return packageJson.version;
}

function revertPackageJson() {
  console.log("## revertPackageJson");
  exec("git checkout package.json", execCallback("revertPackageJson"));
}

function execCreateReleaseBranch(nextVersionNo) {
  console.log(`## execCreateReleaseBranch. nextVersionNo: ${nextVersionNo}`);
  exec(
    `git checkout -b release/v${nextVersionNo} && git push --set-upstream origin release/v${nextVersionNo}`,
    execCallback("execCreateReleaseBranch")
  );
}

const version = getVersionFromChangeset();
execNpmVersion(version);

const nextVersionNo = getNextVersionNo();
revertPackageJson();
execCreateReleaseBranch(nextVersionNo);
