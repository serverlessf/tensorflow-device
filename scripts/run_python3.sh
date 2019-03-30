#!/bin/sh
if [ ! -f "pip_install.log" ]; then
  pip install -r requirements.txt > pip_install.log
fi
python main.py "$@"
