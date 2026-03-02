Visualization of AAM
====================

## Components

- Parameter input zone
- Animation zone 

## Parameters

Refer to `/architecture/aam.md`, including
- Static lattice size $N_x, N_y$;
- Dynamic lattice size $d_x, d_y$;
- Motion matrix $M(d_x,d_y,T)=[[x_1(0),...,x_{d_x}(0);y_1(0),...,y_{d_y}(0)],...,[x_1(T),...,x_{d_x}(T);y_1(T),...,y_{d_y}(T)]]$;
- Initial static occupation function, an $N_x \times N_y$ binary matrix.

## Visualization 

- Static lattice, keep static once initialized. Each site depicted as an empty small circle. Fill the sites if it is occupied by the initial static function.
- Dynamic lattice. After initialization, put at the positions given by $x(0), y(0)$'s.
- Motion of the Dynamic lattice. Given the motion matrix, do the following. A back-and parameter $\delta$ is set.
  - Move (t). Move the dynamic lattice according to the matrix $M$. First move left-down to $(x(t)-1/2,y(t)-1/2)$ (this is for not cross any static lattice site during motion), then each column moves to the positions defined by $(x(t+1) - 1/2)$'s, ($1/2$ site left for not cross the static lattice during y-move), then each row moves to the positions of $y(t+1)$'s, finally move right to the proper position given by $(x(t+1)-\delta, y(t+1))$'s if $t+1 < T$, otherwise to $(x(T), y(T))$'s.
  - The dynamic lattice circles are empty or filled according to the dynamic occupation function.
  - Before move (0), apply the first update to os and od functions according to the definition in `/architecture/aam.md`.
  - After move (T), check the offload condition and display the result.