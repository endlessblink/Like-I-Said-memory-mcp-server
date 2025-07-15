from setuptools import setup, find_packages

setup(
    name="like-i-said-v2",
    version="2.0.0",
    packages=find_packages(),
    install_requires=[
        "pyyaml>=6.0",
        "python-dateutil>=2.8.2",
    ],
    python_requires=">=3.8",
    entry_points={
        "console_scripts": [
            "like-i-said=like_i_said.server:main",
        ],
    },
)