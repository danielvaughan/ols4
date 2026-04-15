# Source Map

| Topic | Source Files | Why These Are Source Of Truth |
| --- | --- | --- |
| Project framing and scope | `README.md`, `docs/springguard-plan.md` | They define what SpringGuard is, what it is trying to prove, and what has been cut from scope |
| Demo choreography and talk track | `docs/springguard-demo-script.md`, `docs/springguard-presentation-outline.md`, `docs/springguard-judge-answers.md` | They describe the live story, the visible loop, and the claims meant for judges |
| Day-before and hackathon-day execution | `docs/springguard-day-before-plan.md`, `docs/springguard-hackathon-day-plan.md`, `docs/hackathon-demo-baseline.md` | They capture the actual preparation state, priorities, and fallback expectations |
| Local SonarQube and target repo setup | `docs/sonarqube-setup-mac.md` | It records the concrete local SonarQube setup, target repo commands, and known caveats |
| Dashboard behavior | `springguard-dashboard/README.md`, `springguard-dashboard/index.html`, `springguard-dashboard/app.js`, `springguard-dashboard/demo-state/*.json` | These files define the dashboard purpose, panels, polling cadence, and feed contract |
| Plugin packaging and workflow boundary | `plugin/README.md`, `plugin/.codex-plugin/plugin.json`, `plugin/skills/springguard/SKILL.md` | They define what the plugin packages and what must remain repo-local in the target repo |
| Local Agent SDLC rules | `.agent-sdlc/config.yaml`, `.agents/skills/backlog-item/SKILL.md`, `.agents/skills/requirement/SKILL.md`, `.agents/skills/implementation-spec/SKILL.md`, `.agents/skills/risk/SKILL.md`, `.agents/skills/project-context/SKILL.md` | They define artifact naming, storage rules, and the local skills that create durable docs |

## Notes

- Many behavior claims in this repo are documented in markdown rather than implemented in code because this repo is primarily a workflow and demo repo.
- The most important system boundary is between this repo and the external `ols4` demo repo.
- When a topic seems ambiguous, prefer the docs first, then use the dashboard and plugin code to confirm what is actually implemented locally.
