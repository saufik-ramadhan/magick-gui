# PyInstaller entry point for rembg
# Implements only the 'i' subcommand: rembg.exe i [--model MODEL] input output
# Avoids rembg.cli → rembg.commands.s_command → gradio dependency chain.
import sys
import argparse
from pathlib import Path


def run_i_command(args):
    """Remove background from a single image file."""
    # Import here so PyInstaller can collect without running cli bootstrap
    from rembg.bg import remove
    from rembg.session_factory import new_session

    model = args.model or 'u2net'
    session = new_session(model)

    input_path = Path(args.input)
    output_path = Path(args.output)

    if not input_path.exists():
        print(f"Error: input file not found: {input_path}", file=sys.stderr)
        sys.exit(1)

    output_path.parent.mkdir(parents=True, exist_ok=True)

    data = input_path.read_bytes()
    result = remove(data, session=session)
    output_path.write_bytes(result)


def main():
    parser = argparse.ArgumentParser(prog='rembg', description='Remove image background')
    sub = parser.add_subparsers(dest='command')

    i_parser = sub.add_parser('i', help='Process a single image')
    i_parser.add_argument('-m', '--model', default='u2net', help='Model name')
    i_parser.add_argument('input', help='Input image path')
    i_parser.add_argument('output', help='Output image path')

    args = parser.parse_args()

    if args.command == 'i':
        run_i_command(args)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == '__main__':
    main()
