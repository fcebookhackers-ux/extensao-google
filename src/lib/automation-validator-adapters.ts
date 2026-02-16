import type { AutomationEditorDoc, EditorBlock } from "@/pages/dashboard/automacoes/editorTypes";
import type { AutomationBlock, AutomationConnection, AutomationFlow } from "@/types/automation-validation";

function connId(from: string, to: string, suffix = "") {
  return `c_${from}_${to}${suffix ? `_${suffix}` : ""}`;
}

function toAutomationBlock(block: EditorBlock): AutomationBlock {
  if (block.type === "message") {
    return { id: block.id, type: "message", data: { text: (block as any).text }, position: { x: 0, y: 0 } };
  }

  if (block.type === "question") {
    return {
      id: block.id,
      type: "question",
      data: { prompt: (block as any).prompt, saveToVariable: (block as any).saveToVariable },
      position: { x: 0, y: 0 },
    };
  }

  if (block.type === "delay") {
    return { id: block.id, type: "delay", data: { amount: (block as any).amount, unit: (block as any).unit }, position: { x: 0, y: 0 } };
  }

  if (block.type === "condition") {
    return {
      id: block.id,
      type: "condition",
      data: { field: (block as any).field, operator: (block as any).operator, value: (block as any).value },
      position: { x: 0, y: 0 },
    };
  }

  if (block.type === "jump") {
    return { id: block.id, type: "action", data: { actionType: "goto", toBlockId: (block as any).toBlockId }, position: { x: 0, y: 0 } };
  }

  if (block.type === "end") {
    return { id: block.id, type: "action", data: { actionType: "end" }, position: { x: 0, y: 0 } };
  }

  // action
  const action = block as any;
  if (action?.actionType === "webhook") {
    return { id: block.id, type: "webhook", data: { url: action.webhook?.url }, position: { x: 0, y: 0 } };
  }
  return { id: block.id, type: "action", data: action, position: { x: 0, y: 0 } };
}

function addSequentialConnections(blocks: EditorBlock[], connections: AutomationConnection[], prefix: string) {
  for (let i = 0; i < blocks.length - 1; i++) {
    connections.push({
      id: connId(blocks[i]!.id, blocks[i + 1]!.id, prefix),
      from: blocks[i]!.id,
      to: blocks[i + 1]!.id,
    });
  }
}

export function editorDocToAutomationFlow(doc: AutomationEditorDoc): AutomationFlow {
  const startId = `start_${doc.id}`;

  const blocks: AutomationBlock[] = [
    { id: startId, type: "start", data: { trigger: doc.trigger }, position: { x: 0, y: 0 } },
  ];
  const connections: AutomationConnection[] = [];

  const top = doc.blocks ?? [];
  for (const b of top) blocks.push(toAutomationBlock(b));

  if (top[0]) connections.push({ id: connId(startId, top[0].id, "start"), from: startId, to: top[0].id });
  addSequentialConnections(top, connections, "main");

  for (let i = 0; i < top.length; i++) {
    const b = top[i]!;
    const next = top[i + 1];

    if (b.type === "jump") {
      const to = (b as any).toBlockId as string | undefined;
      if (to) connections.push({ id: connId(b.id, to, "jump"), from: b.id, to });
    }

    if (b.type === "condition") {
      const branches = (b as any).branches as Array<{ id: string; label: string; blocks: EditorBlock[] }>;
      if (!Array.isArray(branches)) continue;

      for (const br of branches) {
        const brBlocks = br.blocks ?? [];
        for (const inner of brBlocks) blocks.push(toAutomationBlock(inner));

        if (brBlocks[0]) {
          connections.push({
            id: connId(b.id, brBlocks[0].id, `cond_${br.id}`),
            from: b.id,
            to: brBlocks[0].id,
            condition: br.label,
          });
        }

        addSequentialConnections(brBlocks, connections, `branch_${br.id}`);

        const last = brBlocks[brBlocks.length - 1];
        if (last && next) connections.push({ id: connId(last.id, next.id, `join_${br.id}`), from: last.id, to: next.id });
      }
    }
  }

  return { blocks, connections };
}
