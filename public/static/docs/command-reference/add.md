# add

Take a data file or a directory under DVC control (by creating a corresponding
[DVC-file](/doc/user-guide/dvc-file-format)).

## Synopsis

```usage
usage: dvc add [-h] [-q | -v] [-R] [--no-commit] [-f FILE]
               targets [targets ...]

positional arguments:
  targets               Input files/directories to add.
```

## Description

The `dvc add` command is analogous to the `git add` command. By default though,
an added file or directory is also committed to the <abbr>cache</abbr>. (Use the
`--no-commit` option to avoid this, and `dvc commit` as a separate step when
ready.)

The `targets` are files or directories to be places under DVC control. These are
turned into <abbr>outputs<abbr> (`outs` field) in a resulting
[DVC-file](/doc/user-guide/dvc-file-format). (See steps below for more details.)
Note that target data outside the current <abbr>workspace</abbr> is supported,
that becomes [external outputs](/doc/user-guide/managing-external-data).

Under the hood, a few actions are taken for each file (or directory) in
`targets`:

1. Calculate the file checksum.
2. Move the file contents to the cache directory (by default in `.dvc/cache`),
   using the checksum to form the cached file names. (See
   [Structure of cache directory](/doc/user-guide/dvc-files-and-directories#structure-of-cache-directory)
   for more details.)
3. Attempt to replace the file by a link to the file in cache (more details
   below).
4. Create a corresponding DVC-file and store the checksum to identify the cached
   file. Unless the `-f` option is used, the DVC-file name generated by default
   is `<file>.dvc`, where `<file>` is the file name of the first target.
5. Unless `dvc init --no-scm` was used when initializing the project, add the
   `targets` to `.gitignore` in order to prevent them from being committed to
   the Git repository.
6. Unless `dvc init --no-scm` was used when initializing the project,
   instructions are printed showing `git` commands for adding the files to a Git
   repository.

The result is that the target data gets cached by DVC, and instead small
DVC-files can be tracked with Git. The DVC-file lists the added file as an
output (`outs` field), and references the cached file using the checksum. See
[DVC-File Format](/doc/user-guide/dvc-file-format) for more details.

> Note that DVC-files created by this command are considered _orphans_ because
> they have no dependencies, only outputs. These _orphan_ "stage files" are
> always treated as _changed_ by `dvc repro`, which always executes them. See
> `dvc run` to learn about regular stage files.

By default DVC tries to use reflinks (see
[File link types](/doc/user-guide/large-dataset-optimization#file-link-types-for-the-dvc-cache)
to avoid copying any file contents and to optimize DVC-file operations for large
files. DVC also supports other link types for use on file systems without
`reflink` support, but they have to be specified manually. Refer to the
`cache.type` config option in `dvc config cache` for more information.

A `dvc add` target can be an individual file or a directory. There are two ways
to work with directory hierarchies with `dvc add`:

1. With `dvc add --recursive`, the hierarchy is traversed and every file is
   added individually as described above. This means every file has its own
   DVC-file, and a corresponding cached file is created (unless the
   `--no-commit` flag is used).
2. When not using `--recursive` a DVC-file is created for the top of the
   directory (with default name `dirname.dvc`). Every file in the hierarchy is
   added to the cache (unless `--no-commit` flag is added), but DVC does not
   produce individual DVC-files for each file in the directory tree. Instead,
   the single DVC-file points to a file in the cache that contains references to
   the files in the added hierarchy.

In a <abbr>DVC project</abbr>, `dvc add` can be used to version control any
<abbr>data artifact</abbr> (input, intermediate, or output files and
directories, and model files). It is useful by itself to go back and forth
between different versions of datasets or models. We recommend using `dvc run`
and `dvc repro` mechanism to version control intermediate and final results
(like models) though. This way you bring data provenance and make your project
reproducible.

## Options

- `-R`, `--recursive` - determines the files to add by searching each target
  directory and its subdirectories for data files. For each file found, a new
  DVC-file is created using the process described in this command's description.
  `targets` is expected to contain one or more directories for this option to
  have effect.

- `--no-commit` - do not save outputs to cache. A DVC-file is created, and an
  entry is added to `.dvc/state`, while nothing is added to the cache. (The
  `dvc status` command will report that the file is `not in cache`.) This is
  analogous to using `git add` before `git commit`. Use `dvc commit` when ready
  to commit the results to cache.

- `-h`, `--help` - prints the usage/help message, and exit.

- `-q`, `--quiet` - do not write anything to standard output. Exit with 0 if no
  problems arise, otherwise 1.

- `-v`, `--verbose` - displays detailed tracing information.

- `-f`, `--file` - specify name of the DVC-file it generates. This option works
  only if there is a single target. By default the name of the generated
  DVC-file is `<target>.dvc`, where `<target>` is the file name of the given
  target. This option allows to set the name and the path of the generated
  DVC-file.

## Example: Single file

Take a file under DVC control:

```dvc
$ dvc add data.xml

Saving information to 'data.xml.dvc'.

To track the changes with git run:

	git add .gitignore data.xml.dvc
```

As the output says, a [DVC-file](/doc/user-guide/dvc-file-format) has been
created for `data.xml`. Let's explore the result:

```dvc
$ tree
.
├── data.xml
└── data.xml.dvc
```

Let's check the `data.xml.dvc` file inside:

```yaml
md5: aae37d74224b05178153acd94e15956b
outs:
  - cache: true
    md5: d8acabbfd4ee51c95da5d7628c7ef74b
    metric: false
    path: data.xml
meta: # Special field to contain arbitary user data
  name: John
  email: john@xyz.com
```

This is a standard DVC-file with only an `outs` entry. The checksum should
correspond to an entry in the <abbr>cache</abbr>.

> Note that the `meta` values above were entered manually for this example. Meta
> values and `#` comments are not preserved when a DVC-file is overwritten with
> the `dvc add`, `dvc run`, `dvc import`, or `dvc import-url` commands.

```dvc
$ file .dvc/cache/d8/acabbfd4ee51c95da5d7628c7ef74b

.dvc/cache/d8/acabbfd4ee51c95da5d7628c7ef74b: ASCII text
```

Note that tracking compressed files (e.g. ZIP or TAR archives) is not
recommended, as `dvc add` supports tracking directories. (Details below.)

## Example: Directory

Let's suppose your goal is to build an algorithm to identify cats and dogs in
pictures. You may then have hundreds or thousands of pictures of these animals
in a directory, and this is your training dataset:

```dvc
$ tree pics --filelimit 3
pics
├── train
│   ├── cats [many image files]
│   └── dogs [many image files]
└── validation
    ├── cats [more image files]
    └── dogs [more image files]
```

Taking a directory under DVC control as simple as with a single file:

```dvc
$ dvc add pics
Computing md5 for a large number of files. This is only done once.
...
Linking directory 'pics'.

Saving information to 'pics.dvc'.
...
```

There are no [DVC-files](/doc/user-guide/dvc-file-format) generated within this
directory structure, but the images are all added to the <abbr>cache</abbr>. DVC
prints a message about this, mentioning that `md5` values are computed for each
directory. A single `pics.dvc` DVC-file is generated for the top-level
directory, and it contains:

```yaml
md5: df06d8d51e6483ed5a74d3979f8fe42e
outs:
  - cache: true
    md5: b8f4d5a78e55e88906d5f4aeaf43802e.dir
    metric: false
    path: pics
wdir: .
```

> Refer to
> [Structure of cache directory](/doc/user-guide/dvc-files-and-directories#structure-of-cache-directory)
> for more info.

This allows us to treat the entire directory structure as one unit (a dependency
or an <abbr>output</abbr>) with DVC commands. For example, it lets you pass the
whole directory tree as a dependency to a `dvc run` stage definition:

```dvc
$ dvc run -f train.dvc \
          -d train.py -d pics \
          -M metrics.json -o model.h5 \
          python train.py
```

> To follow the full example, see
> [Tutorial: Versioning](/doc/tutorials/versioning).

If instead we use the `--recursive` (`-R`) option, the output looks like this:

```dvc
$ dvc add -R pics
Saving information to 'pics/cat1.jpg.dvc'.
Saving information to 'pics/cat3.jpg.dvc'.
Saving information to 'pics/cat2.jpg.dvc'.
Saving information to 'pics/cat4.jpg.dvc'.
...
```

In this case, a DVC-file is generated for each file in the `pics/` directory
tree. No top-level DVC-file is generated, which is typically less convenient.
For example, we cannot use the directory structure as one unit with `dvc run` or
other commands.
