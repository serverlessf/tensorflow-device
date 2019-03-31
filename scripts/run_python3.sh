cd /usr/src/app
if [ ! -f "pip_install.done" ]; then
  pip install -r requirements.txt
  touch pip_install.done
fi
python dev.py "$@"
