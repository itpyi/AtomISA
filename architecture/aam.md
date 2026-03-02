AAM (AOD Atom Motion) Axioms
============================

## Definition and statement

### The lattices

An atom is always held in a lattice, either a static one or a dynamic one.

| Name            | Mathematical description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Physical realization |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| Static lattice  | A $N_x\times N_y$ lattice                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | SLM                  |
| Dynamic lattice | A $d_x\times d_y$ sublattice of the static lattice, indexed by the column and row indices of the static lattice. The index generally looks like $(x_1,...,x_{d_x}; y_1,...,y_{d_y})$, with $d_x \leq N_x, d_y \leq N_y$. The coordinate of the dynamic lattice itself is $(i,j)$ with $1\leq i \leq d_x, 1 \leq j\leq d_y$, and the parameters in the indices $(x_i, y_j)$ describe that the $(i,j)$ site of the dynamic lattice is _near_ the $(x_i, y_j)$ site of the static lattice. | AOD                  |

One may keep two data sets:
- Atom to lattice: which atom is held by which lattice site.
- Lattice to atom: whether each site is occupied or empty.

We will need the occupation function defined below:
- Static occupation function: $\text{os}(x,y)$ takes 0 if the site $(x,y)$ of static lattice is empty, and 1 if the site is occupied.
- Dynamic occupation function: $\text{od}(i,j)$ takes 0 if the site $(i,j)$ of the dynamic lattice is empty, and 1 of occupied.

### Motion cycle

Intuitively, in a motion cycle, an AOD carries some atoms, travels around, and finally loads them back to the static lattice. We give a rigorous description below.

**Definition.** A motion cycle of type $(d_x,d_y, T)$ is defined by a $(T+1) \times (d_x + d_y)$ matrix $M(d_x,d_y,T)=[[x_1(0),...,x_{d_x}(0);y_1(0),...,y_{d_y}(0)],...,[x_1(T),...,x_{d_x}(T);y_1(T),...,y_{d_y}(T)]]$, such that for all $0\leq t \leq T$, $i and $y_i(t) < y_j(t)$. In other words,$\{x_i(t)\}, \{y_i(t)\}$ are increasing series with label $i$.

**Definition.** By acting a motion cycle $M(d_x,d_y,T)$ to a static occupation function $\text{os}$, it updates the occupation function through following two steps:
- For all $(i,j)$, $\text{od}(i, j) = \text{os}(x_i(0), y_j(0)), \text{os}(x_i(0), y_j(0)) = 0$.
- If for all $(i,j)$, $\text{os}(x_i(T), y_j(T)) \text{od}(i,j) = 0$ (call this offload condition), then update $\text{os}(x_i(T), y_j(T))=\text{od}(i,j)$. Otherwise, we say the motion cycle $M(d_x,d_y,T)$ cannot be acted on the occupation function.

### Entangling gate

In an action of a motion cycle $M(d_x,d_y,T)$, there are $T$ steps. At step $t$, if an overall entangling laser beam is applied, then if a site now has two atoms, they will be applied a CZ gate. The condition is that $\text{os}(x_{i}(t),y_{j}(t))\text{od}(i,j) = 1$.

  