import { memo } from "react";
import TreeNode from "./TreeNode";
import type { CatalogNode } from "../../hooks/useCatalogTree";

interface Props {
  nodes:    CatalogNode[];
  isAdmin:  boolean;
  onAdd:    (parentId:string, name:string, type:string) => Promise<void>;
  onEdit:   (id:string, name:string) => Promise<void>;
  onDelete: (id:string) => Promise<void>;
  onToggle: (id:string, current:boolean) => Promise<void>;
  depth?:   number;
}

const CatalogTree = memo(({ nodes, isAdmin, onAdd, onEdit, onDelete, onToggle, depth=0 }: Props) => {
  if (!nodes?.length) return null;
  return (
    <div>
      {nodes.map(node => (
        <TreeNode key={node.id} node={node} depth={depth} isAdmin={isAdmin}
          onAdd={onAdd} onEdit={onEdit} onDelete={onDelete} onToggle={onToggle} />
      ))}
    </div>
  );
});

export default CatalogTree;


