"""
Mixamo FBX to GLB Converter for Blender (Python Script)

Usage:
  1. Convert single file:
     blender --background --python fbx_to_glb.py -- path/to/animation.fbx path/to/output.glb

  2. Batch convert directory:
     blender --background --python fbx_to_glb.py -- path/to/fbx_dir/ path/to/output_dir/

  3. Auto-convert default directory:
     blender --background --python fbx_to_glb.py
"""

import sys
import os
import glob
import bpy

def clear_scene():
    """Remove default objects from Blender scene."""
    bpy.ops.wm.read_factory_settings(use_empty=True)

def convert_fbx_to_glb(fbx_path, glb_path):
    """Import an FBX animation file and export as GLB."""
    print(f"[FBX->GLB] Importing FBX: {fbx_path}")
    clear_scene()

    # Import FBX (Mixamo format without skin or with skin)
    bpy.ops.import_scene.fbx(
        filepath=fbx_path,
        use_manual_orientation=False,
        global_scale=1.0,
        bake_space_transform=False,
        use_custom_normals=True,
        use_image_search=False,
        use_alpha_decals=False,
        decal_offset=0.0,
        use_anim=True,
        anim_offset=1.0,
        use_subsurf=False,
        use_custom_props=True,
        use_custom_props_enum_as_string=True,
        ignore_leaf_bones=True,
        force_connect_children=False,
        automatic_bone_orientation=False,
        primary_bone_axis='Y',
        secondary_bone_axis='X',
        use_prepost_rot=True
    )

    # Ensure output directory exists
    out_dir = os.path.dirname(os.path.abspath(glb_path))
    if not os.path.exists(out_dir):
        os.makedirs(out_dir, exist_ok=True)

    # Export to GLB
    print(f"[FBX->GLB] Exporting GLB: {glb_path}")
    bpy.ops.export_scene.gltf(
        filepath=glb_path,
        export_format='GLB',
        export_copyright='',
        export_image_format='AUTO',
        export_texcoords=True,
        export_normals=True,
        export_draco_mesh_compression_enable=False,
        export_tangents=False,
        export_materials='NONE',  # Strip materials if animation only
        export_colors=False,
        export_cameras=False,
        export_selected=False,
        use_selection=False,
        export_animations=True,
        export_current_frame=False,
        export_skins=True,
        export_all_influences=False,
        export_morph=False,
        export_lights=False
    )
    print(f"[FBX->GLB] Completed: {glb_path}")

def main():
    args = []
    if "--" in sys.argv:
        args = sys.argv[sys.argv.index("--") + 1:]

    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_public = os.path.abspath(os.path.join(script_dir, "../public/assets/animations"))

    if len(args) >= 2:
        in_path = os.path.abspath(args[0])
        out_path = os.path.abspath(args[1])

        if os.path.isdir(in_path):
            # Batch conversion mode
            fbx_files = glob.glob(os.path.join(in_path, "*.fbx"))
            print(f"[FBX->GLB] Found {len(fbx_files)} FBX files in {in_path}")
            for fbx in fbx_files:
                base_name = os.path.splitext(os.path.basename(fbx))[0]
                target_glb = os.path.join(out_path, f"{base_name}.glb")
                convert_fbx_to_glb(fbx, target_glb)
        else:
            convert_fbx_to_glb(in_path, out_path)

    elif len(args) == 1:
        in_path = os.path.abspath(args[0])
        if os.path.isfile(in_path):
            base_name = os.path.splitext(os.path.basename(in_path))[0]
            target_glb = os.path.join(project_public, f"{base_name}.glb")
            convert_fbx_to_glb(in_path, target_glb)
        elif os.path.isdir(in_path):
            fbx_files = glob.glob(os.path.join(in_path, "*.fbx"))
            for fbx in fbx_files:
                base_name = os.path.splitext(os.path.basename(fbx))[0]
                target_glb = os.path.join(project_public, f"{base_name}.glb")
                convert_fbx_to_glb(fbx, target_glb)

    else:
        # Default mode: scan project animations directory for FBX files
        fbx_dir = os.path.join(project_public, "fbx")
        if os.path.exists(fbx_dir):
            fbx_files = glob.glob(os.path.join(fbx_dir, "*.fbx"))
            print(f"[FBX->GLB] Auto-converting {len(fbx_files)} files from {fbx_dir}")
            for fbx in fbx_files:
                base_name = os.path.splitext(os.path.basename(fbx))[0]
                target_glb = os.path.join(project_public, f"{base_name}.glb")
                convert_fbx_to_glb(fbx, target_glb)
        else:
            print("[FBX->GLB] Usage: blender --background --python fbx_to_glb.py -- <input.fbx> <output.glb>")

if __name__ == "__main__":
    main()
